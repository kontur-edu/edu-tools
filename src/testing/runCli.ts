import { GoogleApi } from '../apis/GoogleApi'
import { NodeCredentials } from '../apis/NodeCredentials'
import { runProgramAsync } from '../cli/program'

// Только для тестов (в сборку не входит, см. tsconfig.json).

/**
 * Запускает CLI через публичный вход без сети: учётных данных систем нет, Google API — переданный
 * (по умолчанию его нет: обращение к Google — ошибка теста).
 */
export async function runCliAsync(args: string[], googleApi: GoogleApi | null = null) {
  let stdout = ''
  let stderr = ''
  let exitCode = -1
  await runProgramAsync(
    {
      credentials: new NodeCredentials({
        env: {},
        readFile: () => {
          throw new Error('no files')
        },
      }),
      googleApiAsync: async () => {
        if (!googleApi) throw new Error('Google API в тесте не задан')
        return googleApi
      },
      streams: { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
      setExitCode: (code) => (exitCode = code),
    },
    args,
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = args.includes('--json') ? (JSON.parse(stdout) as any) : null
  return { stdout, stderr, exitCode, json }
}
