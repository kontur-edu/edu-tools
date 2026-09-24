import { Command, CommanderError } from 'commander'
import { registerAuthCommands } from './commands/authCheck.js'
import { registerGoogleCommands } from './commands/googleLogin.js'
import { registerTaskCommands } from './commands/taskRun.js'
import { CliError } from './errors.js'
import { ExitCode, writeOutcome } from './output.js'
import { CliContext } from './runCommand.js'

export function createProgram(context: CliContext, json: boolean): Command {
  const program = new Command('edu-tools')
    .description(
      'EduTools CLI: административные операции в системах УрФУ без web-интерфейса. ' +
        'Учётные данные — из .env / secrets/ (см. .env.sample).',
    )
    .option('--json', 'машиночитаемый вывод: в stdout только JSON { command, ok, message, result | error }')
    .configureHelp({ showGlobalOptions: true })
    .showHelpAfterError(!json)
    .exitOverride()
    .configureOutput({
      writeOut: context.streams.stdout,
      writeErr: context.streams.stderr,
      // Ошибки разбора в режиме --json выводятся JSON-конвертом в runProgramAsync.
      outputError: (text, write) => (json ? undefined : write(text)),
    })
    .addHelpText(
      'after',
      `
Команды верхнего уровня группируют подкоманды: auth check, google login, task list, task run.
Вывод: human по умолчанию, --json — объект в stdout; ошибки — code + message + details.
Коды выхода: 0 — успех, 1 — отрицательный результат или ошибка, 2 — неверный вызов (USAGE_ERROR).

Примеры:
  $ npm run -s cli -- --help
  $ npm run -s cli -- auth check --json
  $ npm run -s cli -- auth check --system its
  $ npm run -s cli -- task run task.csv --json
  $ npm run -s cli -- google login`,
    )

  registerAuthCommands(program, context)
  registerGoogleCommands(program, context)
  registerTaskCommands(program, context)
  return program
}

/** Разбирает аргументы и выполняет команду; ошибки Commander превращаются в `USAGE_ERROR` с кодом выхода 2. */
export async function runProgramAsync(context: CliContext, args: string[]) {
  const json = args.includes('--json')
  const program = createProgram(context, json)
  try {
    await program.parseAsync(args, { from: 'user' })
  } catch (e) {
    if (!(e instanceof CommanderError)) throw e
    if (e.exitCode === 0) {
      context.setExitCode(ExitCode.ok)
      return
    }
    // Вызов группы без подкоманды (`auth`) Commander сообщает как показ справки с ошибкой.
    const message =
      e.code === 'commander.help' ? 'Не указана подкоманда: см. --help.' : e.message.replace(/^error: /, '')
    const error = new CliError('USAGE_ERROR', message, { commanderCode: e.code })
    // В human-режиме Commander уже вывел сообщение и справку в stderr.
    if (json) {
      writeOutcome('json', null, error, context.streams)
    }
    context.setExitCode(ExitCode.usage)
  }
}
