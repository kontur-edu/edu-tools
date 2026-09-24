import { CliError } from './errors.js'

/** 0 — успех; 1 — команда выполнена с отрицательным результатом или упала; 2 — неверный вызов. */
export const ExitCode = { ok: 0, failed: 1, usage: 2 } as const

/** Что возвращает обработчик команды: итог, сообщение для человека и машиночитаемый результат. */
export type CommandOutput = {
  ok: boolean
  message: string
  result: unknown
  /** Человекочитаемое представление результата; по умолчанию — `message`. */
  text?: string
}

export type OutputMode = 'human' | 'json'

export type CliStreams = {
  stdout: (text: string) => void
  stderr: (text: string) => void
}

/** JSON-конверт `--json`: `{ command, ok, message, result }` либо `{ command, ok: false, message, error }`. */
export function renderJson(command: string | null, outcome: CommandOutput | CliError): string {
  const envelope =
    outcome instanceof CliError
      ? {
          command,
          ok: false,
          message: outcome.message,
          error: { code: outcome.code, message: outcome.message, details: outcome.details },
        }
      : { command, ok: outcome.ok, message: outcome.message, result: outcome.result }
  return JSON.stringify(envelope, null, 2) + '\n'
}

export function renderHumanError(error: CliError): string {
  const details = Object.entries(error.details).map(([key, value]) => `  ${key}: ${formatDetail(value)}`)
  return [`Ошибка ${error.code}: ${error.message}`, ...details].join('\n') + '\n'
}

export function exitCodeFor(outcome: CommandOutput | CliError): number {
  if (outcome instanceof CliError) return outcome.code === 'USAGE_ERROR' ? ExitCode.usage : ExitCode.failed
  return outcome.ok ? ExitCode.ok : ExitCode.failed
}

/** Пишет итог команды: human — результат в stdout, ошибка в stderr; json — всё одним объектом в stdout. */
export function writeOutcome(
  mode: OutputMode,
  command: string | null,
  outcome: CommandOutput | CliError,
  streams: CliStreams,
): number {
  if (mode === 'json') {
    streams.stdout(renderJson(command, outcome))
  } else if (outcome instanceof CliError) {
    streams.stderr(renderHumanError(outcome))
  } else {
    streams.stdout((outcome.text ?? outcome.message) + '\n')
  }
  return exitCodeFor(outcome)
}

function formatDetail(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  return typeof value === 'string' ? value : JSON.stringify(value)
}
