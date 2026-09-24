import { spawn } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { BRS_USER_VARIABLE, credentialsSystems, CredentialsSystem } from '../apis/NodeCredentials'

// Только для тестов (в сборку не входит, см. tsconfig.json).
// Каркас сценариев: собранный CLI запускается отдельным процессом, как его запускают человек и ИИ-агент.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/** Куда собирается CLI для сценариев: отдельно от `build/`, чтобы не затирать сборку web и `npm run build`. */
export const cliBuildDir = path.join(repoRoot, '.cache', 'cli-build')

/** Абсолютный путь к CSV-фикстуре сценария: `src/cli/scenarios/fixtures/<name>`. */
export const scenarioFixture = (name: string) => path.join(repoRoot, 'src', 'cli', 'scenarios', 'fixtures', name)

const cliMain = path.join(cliBuildDir, 'cli', 'main.js')
const loaderUrl = pathToFileURL(path.join(repoRoot, 'loader.js')).href

/** Сборка `tsc` в `cliBuildDir`; вызывается один раз на прогон из `globalSetup` (`buildCli.globalSetup.ts`). */
export async function buildCliAsync() {
  fs.rmSync(cliBuildDir, { recursive: true, force: true })
  const tsc = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc')
  const { exitCode, stdout, stderr } = await spawnAsync(
    process.execPath,
    [tsc, '-p', 'tsconfig.json', '--outDir', cliBuildDir],
    { cwd: repoRoot, env: process.env },
  )
  if (exitCode !== 0) {
    throw new Error(`Сборка CLI для сценариев не удалась (tsc, код ${exitCode}):\n${stdout}${stderr}`)
  }
}

export type CliProcessResult = {
  stdout: string
  stderr: string
  exitCode: number
  /** stdout, разобранный как JSON, если передан `--json`. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any
}

/**
 * Офлайн-сценарий: CLI без учётных данных систем — переменные учётных данных убраны из окружения,
 * а рабочая папка временная, чтобы `.env` репозитория не подхватился. Пути в аргументах — абсолютные.
 */
export async function runOfflineCliAsync(args: string[]): Promise<CliProcessResult> {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'edu-tools-scenario-'))
  try {
    return await runCliProcessAsync(args, { cwd, env: withoutCredentials(process.env) })
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true })
  }
}

/**
 * Живой сценарий: CLI с учётными данными из `.env` / `secrets/` репозитория и окружения.
 * Только try (ADR-0003): `--save` отклоняется до запуска процесса.
 */
export async function runLiveCliAsync(args: string[]): Promise<CliProcessResult> {
  if (args.some((arg) => arg === '--save' || arg.startsWith('--save='))) {
    throw new Error('Живые сценарии выполняются только в try: --save запрещён, внешние системы не меняются.')
  }
  return runCliProcessAsync(args, { cwd: repoRoot, env: process.env })
}

/**
 * Чего не хватает для живого сценария системы — по `auth check --system <system> --json`:
 * `null`, если учётные данные приняты; текст причины пропуска, если они не заданы.
 * Заданные, но не принятые данные (или недоступная система) — ошибка: сценарий должен упасть, а не пропуститься.
 */
export async function missingCredentialsAsync(system: CredentialsSystem): Promise<string | null> {
  const { json } = await runLiveCliAsync(['auth', 'check', '--system', system, '--json'])
  const check = json.result.systems[0]
  if (check.status === 'ok') return null
  if (check.status === 'missing') {
    return `нет учётных данных ${check.title}: задайте ${check.details.variables.join(' или ')}`
  }
  throw new Error(`auth check ${system}: ${check.status} — ${check.message}`)
}

async function runCliProcessAsync(
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
): Promise<CliProcessResult> {
  const { stdout, stderr, exitCode } = await spawnAsync(
    process.execPath,
    ['--no-warnings', '--loader', loaderUrl, cliMain, ...args],
    options,
  )
  let json = null
  if (args.includes('--json')) {
    try {
      json = JSON.parse(stdout)
    } catch {
      throw new Error(`stdout CLI — не JSON (код выхода ${exitCode}):\n${stdout}\nstderr:\n${stderr}`)
    }
  }
  return { stdout, stderr, exitCode, json }
}

function withoutCredentials(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const variables = new Set([BRS_USER_VARIABLE])
  for (const { variable, fileVariable } of Object.values(credentialsSystems)) {
    variables.add(variable)
    variables.add(fileVariable)
  }
  // Приведение: типы CRA объявляют NODE_ENV обязательным, а Object.fromEntries его «теряет».
  return Object.fromEntries(Object.entries(env).filter(([name]) => !variables.has(name))) as NodeJS.ProcessEnv
}

function spawnAsync(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => (stdout += chunk))
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk))
    child.on('error', reject)
    child.on('close', (code) => resolve({ stdout, stderr, exitCode: code ?? -1 }))
  })
}
