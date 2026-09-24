import { Command } from 'commander'
import { googleSecretsPaths, NodeGoogleAuth } from '../../apis/NodeGoogleAuth.js'
import { CliContext, runCommandAsync } from '../runCommand.js'

export function registerGoogleCommands(program: Command, context: CliContext) {
  const google = program.command('google').description('Доступ к Google Таблицам из Node').addHelpText(
    'after',
    `
Примеры:
  $ npm run -s cli -- google login`,
  )

  google
    .command('login')
    .description(
      `Войти в Google (installed-app flow): открыть ссылку, разрешить доступ и вставить код. ` +
        `Нужен OAuth client в ${googleSecretsPaths.projectConfig}; токены сохраняются в ${googleSecretsPaths.tokens}. ` +
        'Команда интерактивная: ссылка и запрос кода выводятся в stderr.',
    )
    .addHelpText(
      'after',
      `
Примеры:
  $ npm run -s cli -- google login
  $ npm run -s cli -- google login --json`,
    )
    .action((_options: object, command: Command) =>
      runCommandAsync(context, command, async () => {
        await NodeGoogleAuth.loginAsync()
        return {
          ok: true,
          message: `Токены Google сохранены в ${googleSecretsPaths.tokens}.`,
          result: { tokensPath: googleSecretsPaths.tokens },
        }
      }),
    )
}
