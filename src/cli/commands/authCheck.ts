import { Command, Option } from 'commander'
import { BrsApi } from '../../apis/BrsApi.js'
import { BrsUrlProvider } from '../../apis/BrsUrlProvider.js'
import { ItsApiV2 } from '../../apis/ItsApiV2.js'
import { ItsUrlProvider } from '../../apis/ItsUrlProvider.js'
import { credentialsSystems, CredentialsSystem, NodeCredentials } from '../../apis/NodeCredentials.js'
import { PartnerApi } from '../../apis/PartnerApi.js'
import { PartnerUrlProvider } from '../../apis/PartnerUrlProvider.js'
import { TeamProjectApiV2 } from '../../apis/TeamProjectApiV2.js'
import { TeamProjectUrlProvider } from '../../apis/TeamProjectUrlProvider.js'
import {
  checkBrsAuthAsync,
  checkItsAuthAsync,
  checkPartnerAuthAsync,
  checkTeamProjectAuthAsync,
} from '../../actions/checkSystemAuthAsync.js'
import { CliError, CliErrorCode, CliErrorDetails, toCliError } from '../errors.js'
import { savedGoogleAuthAsync } from '../googleAuth.js'
import { CommandOutput } from '../output.js'
import { CliContext, runCommandAsync } from '../runCommand.js'

export type AuthSystem = CredentialsSystem | 'google'

export const authSystems: AuthSystem[] = ['brs', 'its', 'teamproject', 'partner', 'google']

/**
 * `unreachable` — система не ответила (сеть, таймаут): про учётные данные ничего не известно;
 * `error` — пробный запрос упал по другой причине (дефект или изменившийся API), см. `details.reason`.
 */
export type AuthStatus = 'ok' | 'missing' | 'invalid' | 'unreachable' | 'error'

export type SystemCheck = {
  system: AuthSystem
  title: string
  status: AuthStatus
  code?: CliErrorCode
  message: string
  details?: CliErrorDetails
}

/** Пробный запрос на чтение: `true` — данные приняты, `false` — отклонены; исключения классифицируются. */
export type AuthProbe = () => Promise<boolean>

export function registerAuthCommands(program: Command, context: CliContext) {
  const auth = program
    .command('auth')
    .description('Учётные данные систем УрФУ и Google')
    .addHelpText(
      'after',
      `
Примеры:
  $ npm run -s cli -- auth check --json
  $ npm run -s cli -- auth check --system its`,
    )

  auth
    .command('check')
    .description(
      'Проверить учётные данные пробным запросом на чтение к каждой системе (или к выбранной). ' +
        'Ничего не записывает. Код выхода 1, если хотя бы одна система не ok.',
    )
    .addOption(new Option('--system <name>', 'проверить только одну систему').choices(authSystems))
    .addHelpText(
      'after',
      `
Статусы: ok — данные приняты; missing — не заданы (CREDENTIALS_MISSING, имена переменных в details);
invalid — заданы, но не приняты или файл не читается (CREDENTIALS_INVALID); unreachable — система не ответила (NETWORK_ERROR).

Примеры:
  $ npm run -s cli -- auth check
  $ npm run -s cli -- auth check --json
  $ npm run -s cli -- auth check --system brs --json`,
    )
    .action((options: { system?: AuthSystem }, command: Command) =>
      runCommandAsync(context, command, async () => {
        const systems = options.system ? [options.system] : authSystems
        return authCheckOutput(await checkSystemsAsync(systems, createProbes(context.credentials)))
      }),
    )
}

export async function checkSystemsAsync(
  systems: AuthSystem[],
  probes: Record<AuthSystem, AuthProbe>,
): Promise<SystemCheck[]> {
  return Promise.all(systems.map((system) => checkSystemAsync(system, probes[system])))
}

async function checkSystemAsync(system: AuthSystem, probe: AuthProbe): Promise<SystemCheck> {
  const title = systemTitle(system)
  try {
    if (await probe()) {
      return { system, title, status: 'ok', message: `${title}: учётные данные приняты.` }
    }
    return { system, title, ...rejected(title) }
  } catch (e) {
    return { system, title, ...classify(toCliError(e), title) }
  }
}

function classify(error: CliError, title: string): Omit<SystemCheck, 'system' | 'title'> {
  switch (error.code) {
    case 'CREDENTIALS_MISSING':
      return { status: 'missing', code: error.code, message: error.message, details: error.details }
    case 'NETWORK_ERROR':
      return {
        status: 'unreachable',
        code: error.code,
        message: `${title}: система недоступна — сетевая ошибка или таймаут.`,
        details: error.details,
      }
    case 'INTERNAL_ERROR':
      if (isLoginPageResponse(error.cause)) return { ...rejected(title), details: { reason: error.message } }
      return {
        status: 'error',
        code: error.code,
        message: `${title}: ${error.message}`,
        details: { ...error.details, reason: error.message },
      }
    default:
      return { status: 'invalid', code: 'CREDENTIALS_INVALID', message: error.message, details: error.details }
  }
}

function rejected(title: string): Omit<SystemCheck, 'system' | 'title'> {
  return {
    status: 'invalid',
    code: 'CREDENTIALS_INVALID',
    message: `${title}: система не приняла учётные данные — обновите их.`,
  }
}

/** С недействительными данными системы отдают страницу входа: JSON не разбирается, а БРС бросает `… is Forbidden`. */
function isLoginPageResponse(error: unknown): boolean {
  return error instanceof SyntaxError || (error instanceof Error && error.message.endsWith(' is Forbidden'))
}

function authCheckOutput(systems: SystemCheck[]): CommandOutput {
  const failed = systems.filter((s) => s.status !== 'ok')
  const message =
    failed.length === 0
      ? 'Все проверенные системы приняли учётные данные.'
      : `Есть проблемы с учётными данными: ${failed.map((s) => s.system).join(', ')}.`
  const lines = systems.map(
    (s) => `${s.status.padEnd(12)} ${s.title.padEnd(12)} ${s.code ? s.code + ': ' : ''}${s.message}`,
  )
  return { ok: failed.length === 0, message, result: { systems }, text: [...lines, '', message].join('\n') }
}

function systemTitle(system: AuthSystem): string {
  return system === 'google' ? 'Google' : credentialsSystems[system].title
}

function createProbes(credentials: NodeCredentials): Record<AuthSystem, AuthProbe> {
  return {
    brs: () => checkBrsAuthAsync(new BrsApi(credentials.brsAuth(), new BrsUrlProvider(false))),
    its: () => checkItsAuthAsync(new ItsApiV2(credentials.itsAuth(), new ItsUrlProvider(false))),
    teamproject: () =>
      checkTeamProjectAuthAsync(new TeamProjectApiV2(credentials.teamProjectAuth(), new TeamProjectUrlProvider(false))),
    partner: () => checkPartnerAuthAsync(new PartnerApi(credentials.partnerAuth(), new PartnerUrlProvider(false))),
    google: checkGoogleAuthAsync,
  }
}

async function checkGoogleAuthAsync(): Promise<boolean> {
  const auth = await savedGoogleAuthAsync()
  const { token } = await auth.authClient.getAccessToken()
  if (!token) return false
  await auth.authClient.getTokenInfo(token)
  return true
}
