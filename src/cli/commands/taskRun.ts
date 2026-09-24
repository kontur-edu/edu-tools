import * as fs from 'fs'
import { Command } from 'commander'
import { BrsApi } from '../../apis/BrsApi.js'
import { BrsUrlProvider } from '../../apis/BrsUrlProvider.js'
import { parseSpreadsheetUrl } from '../../apis/GoogleApi.js'
import { ItsApiV2 } from '../../apis/ItsApiV2.js'
import { ItsUrlProvider } from '../../apis/ItsUrlProvider.js'
import { CredentialsError, NodeCredentials } from '../../apis/NodeCredentials.js'
import { CsvFileTableSource } from '../../apis/NodeCsvFile.js'
import { NodeGoogleApi } from '../../apis/NodeGoogleApi.js'
import { TeamProjectApiV2 } from '../../apis/TeamProjectApiV2.js'
import { TeamProjectUrlProvider } from '../../apis/TeamProjectUrlProvider.js'
import { CompositeTableTaskExecutor, tableTaskTypes } from '../../tasks/CompositeTableTaskExecutor.js'
import { readTableTaskAsync, TableTask, TableTaskWriter } from '../../tasks/TableTask.js'
import { GoogleSheetTableSource, TableSource } from '../../tasks/TableSource.js'
import { TaskExecutionError } from '../../tasks/TaskExecutionError.js'
import { renderTaskEventText } from '../../tasks/TaskEventText.js'
import { summarizeTaskEvents, TaskEvent, TaskEventCollector, TaskEventDetails } from '../../tasks/TaskEvents.js'
import { TaskReporter } from '../../tasks/TaskReporter.js'
import { CliError, CliErrorDetails, toCliError } from '../errors.js'
import { savedGoogleAuthAsync } from '../googleAuth.js'
import { CommandOutput } from '../output.js'
import { CliContext, outputMode, runCommandAsync } from '../runCommand.js'

export type TaskRunMode = 'try' | 'save'

export function registerTaskCommands(program: Command, context: CliContext) {
  const task = program
    .command('task')
    .description('Табличные задания: те же исполнители, что в web')
    .addHelpText(
      'after',
      `
Примеры:
  $ npm run -s cli -- task list
  $ npm run -s cli -- task run task.csv --json
  $ npm run -s cli -- task run "https://docs.google.com/spreadsheets/d/<id>/edit#gid=<sheetId>" --save`,
    )

  task
    .command('list')
    .description('Типы заданий: имя, нужные системы, пишет ли задание результат на лист.')
    .addHelpText(
      'after',
      `
Примеры:
  $ npm run -s cli -- task list
  $ npm run -s cli -- task list --json`,
    )
    .action((_options: unknown, command: Command) => runCommandAsync(context, command, async () => taskListOutput()))

  task
    .command('run')
    .description(
      'Выполнить задание с листа Google Таблицы (URL с #gid=) или из CSV-файла той же разметки. ' +
        'По умолчанию try: во внешние системы ничего не пишется. Код выхода 1, если summary.ok = false.',
    )
    .argument('<source>', 'URL листа Google Таблицы или путь к CSV-файлу')
    .option('--save', 'режим save: записать изменения во внешние системы (иначе try)')
    .addHelpText(
      'after',
      `
Результат --json: { task, mode, events[], summary }; summary.counts — число событий по статусам
(changed, unchanged, skipped, warning, error), summary.ok — нет ошибок и проваленных вердиктов.
Учётные данные берутся только для систем, нужных заданию; для CSV Google не нужен.
Нет учётных данных системы — событие error с details.code = CREDENTIALS_MISSING.
Источник не найден или на листе нет параметра task — ошибка TASK_SOURCE_INVALID.
Задание, пишущее на лист (ExportTechnologyCards), при CSV-источнике в save завершается ошибкой: см. --out (FT-0018).

Примеры:
  $ npm run -s cli -- task run task.csv
  $ npm run -s cli -- task run task.csv --json
  $ npm run -s cli -- task run "https://docs.google.com/spreadsheets/d/<id>/edit#gid=<sheetId>" --save --json`,
    )
    .action((source: string, options: { save?: boolean }, command: Command) =>
      runCommandAsync(context, command, async () => {
        const mode: TaskRunMode = options.save ? 'save' : 'try'
        // В human-режиме лог выводится по мере выполнения, как в web.
        const liveLog = outputMode(command) === 'human' ? (line: string) => context.streams.stdout(line + '\n') : null
        return taskRunAsync(context.credentials, source, mode, liveLog)
      }),
    )
}

export function taskListOutput(): CommandOutput {
  const tasks = tableTaskTypes.map(({ name, systems, writesToSheet }) => ({ name, systems, writesToSheet }))
  const lines = tasks.map(
    (t) => `${t.name.padEnd(28)} ${t.systems.join(', ')}${t.writesToSheet ? '; пишет на лист' : ''}`,
  )
  return {
    ok: true,
    message: `Типов заданий: ${tasks.length}.`,
    result: { tasks },
    text: lines.join('\n'),
  }
}

async function taskRunAsync(
  credentials: NodeCredentials,
  source: string,
  mode: TaskRunMode,
  liveLog: ((line: string) => void) | null,
): Promise<CommandOutput> {
  const tableTask = await readTaskAsync(source)

  const collector = new TaskEventCollector()
  const reporter = liveLog
    ? new TaskReporter(collector.listener, (event) => liveLog(renderTaskEventText(event)))
    : new TaskReporter(collector.listener)
  const executor = new CompositeTableTaskExecutor(
    () => createApi(() => new BrsApi(credentials.brsAuth(), new BrsUrlProvider(false))),
    () => createApi(() => new ItsApiV2(credentials.itsAuth(), new ItsUrlProvider(false))),
    // Partner не нужен ни одному заданию из реестра.
    () => null,
    () => createApi(() => new TeamProjectApiV2(credentials.teamProjectAuth(), new TeamProjectUrlProvider(false))),
    new TableTaskWriter(),
    reporter,
  )

  try {
    await executor.executeAsync(tableTask, mode === 'save')
  } catch (e) {
    // Исключение посреди выполнения (сеть, дефект) — событие error: уже полученные события не теряются.
    const error = toCliError(e)
    reporter.error(tableTask.name, error.message, { stopped: true, details: eventDetails(error.code, error.details) })
  }
  return taskRunOutput(tableTask.name, mode, collector.events)
}

/** Результат `task run`: `{ task, mode, events, summary }`; итог команды — `summary.ok`. */
export function taskRunOutput(task: string, mode: TaskRunMode, events: TaskEvent[]): CommandOutput {
  const summary = summarizeTaskEvents(events)
  const counts = Object.entries(summary.counts)
    .map(([status, count]) => `${status} ${count}`)
    .join(', ')
  const verdicts = summary.verdicts.failed > 0 ? `; failed verdicts ${summary.verdicts.failed}` : ''
  const message = `${task} (${mode}): ${summary.ok ? 'выполнено' : 'есть ошибки'}. ${counts}${verdicts}.`
  return { ok: summary.ok, message, result: { task, mode, events, summary } }
}

async function readTaskAsync(source: string): Promise<TableTask> {
  const tableSource = /^https?:\/\//i.test(source) ? await googleSourceAsync(source) : csvSource(source)
  const tableTask = await readTableTaskAsync(tableSource)
  if (!tableTask) {
    throw new CliError('TASK_SOURCE_INVALID', 'На листе нет задания: не заполнен параметр task ($keys / $values).', {
      source,
      reason: 'no-task',
    })
  }
  return tableTask
}

function csvSource(filePath: string): TableSource {
  if (!fs.existsSync(filePath)) {
    throw new CliError('TASK_SOURCE_INVALID', `Файл ${filePath} не найден.`, { source: filePath, reason: 'not-found' })
  }
  return new CsvFileTableSource(filePath)
}

async function googleSourceAsync(url: string): Promise<TableSource> {
  const { spreadsheetId, sheetId } = parseSpreadsheetUrl(url) ?? {}
  if (!spreadsheetId || !sheetId) {
    throw new CliError(
      'TASK_SOURCE_INVALID',
      'Нужен URL листа Google Таблицы вида https://docs.google.com/spreadsheets/d/<id>/edit#gid=<sheetId>.',
      { source: url, reason: 'bad-url' },
    )
  }
  const googleApi = new NodeGoogleApi(await savedGoogleAuthAsync())
  // Метаданные читаются напрямую, а не через getSheetNameAsync: ошибки сети и авторизации не должны теряться.
  const meta = await googleApi.openSpreadsheet(spreadsheetId).getMetaAsync()
  const sheet = meta.sheets.map((s) => s.properties).find((p) => p.sheetId.toString() === sheetId)
  if (!sheet) {
    throw new CliError('TASK_SOURCE_INVALID', `В таблице нет листа с gid=${sheetId}.`, {
      source: url,
      reason: 'sheet-not-found',
    })
  }
  return new GoogleSheetTableSource(googleApi, spreadsheetId, sheet.title)
}

// API создаётся только когда его запросило задание; нет учётных данных — ошибка задания, а не команды.
function createApi<T>(create: () => T): T {
  try {
    return create()
  } catch (e) {
    if (!(e instanceof CredentialsError)) throw e
    const error = toCliError(e)
    throw new TaskExecutionError(error.message, eventDetails(error.code, error.details))
  }
}

// details события — плоские значения: списки склеиваются через запятую.
function eventDetails(code: string, details: CliErrorDetails): TaskEventDetails {
  const result: TaskEventDetails = { code }
  for (const [key, value] of Object.entries(details)) {
    result[key] = toEventDetailValue(value)
  }
  return result
}

function toEventDetailValue(value: unknown): TaskEventDetails[string] {
  if (Array.isArray(value)) return value.join(', ')
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  return JSON.stringify(value)
}
