import { Command } from 'commander'
import { NodeCredentials } from '../apis/NodeCredentials.js'
import { toCliError } from './errors.js'
import { CliStreams, CommandOutput, OutputMode, writeOutcome } from './output.js'

/** Зависимости команд: подменяются в тестах. */
export type CliContext = {
  credentials: NodeCredentials
  streams: CliStreams
  setExitCode: (code: number) => void
}

export function outputMode(command: Command): OutputMode {
  return command.optsWithGlobals<{ json?: boolean }>().json ? 'json' : 'human'
}

/** Полное имя команды без имени программы, например `auth check`. */
export function commandPath(command: Command): string {
  const names: string[] = []
  for (let current: Command | null = command; current?.parent; current = current.parent) names.unshift(current.name())
  return names.join(' ')
}

/**
 * Единая обёртка обработчика команды: human/`--json` вывод, ошибки `code + message + details`, код выхода.
 * Каждая новая команда выполняется через неё и возвращает `CommandOutput`.
 */
export async function runCommandAsync(
  context: CliContext,
  command: Command,
  handler: () => Promise<CommandOutput>,
) {
  let outcome
  try {
    outcome = await handler()
  } catch (e) {
    outcome = toCliError(e)
  }
  context.setExitCode(writeOutcome(outputMode(command), commandPath(command), outcome, context.streams))
}
