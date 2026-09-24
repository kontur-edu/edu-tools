import * as fs from 'fs'
import * as path from 'path'
import { Command } from 'commander'
import { BrsApi } from '../../apis/BrsApi.js'
import { BrsUrlProvider } from '../../apis/BrsUrlProvider.js'
import { parseSpreadsheetUrl } from '../../apis/GoogleApi.js'
import { ItsApiV2 } from '../../apis/ItsApiV2.js'
import { ItsUrlProvider } from '../../apis/ItsUrlProvider.js'
import { CredentialsError, NodeCredentials } from '../../apis/NodeCredentials.js'
import { CsvFileTableSource, writeCsvFile } from '../../apis/NodeCsvFile.js'
import { NodeGoogleApi } from '../../apis/NodeGoogleApi.js'
import { TeamProjectApiV2 } from '../../apis/TeamProjectApiV2.js'
import { TeamProjectUrlProvider } from '../../apis/TeamProjectUrlProvider.js'
import { CompositeTableTaskExecutor, tableTaskTypes } from '../../tasks/CompositeTableTaskExecutor.js'
import { readTableTaskAsync, TableTask, TableTaskWriter } from '../../tasks/TableTask.js'
import { GoogleSheetTableSource, TableSource, WriteSkippingTableSource } from '../../tasks/TableSource.js'
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
    .option(
      '--out <file.csv>',
      'только для CSV-источника: сохранить лист после записи задания (входная сетка + записанные блоки) ' +
        'в этот файл; пишется и в try, и в save. Входной файл не изменяется никогда',
    )
    .addHelpText(
      'after',
      `
Результат --json: { task, mode, events[], summary } и out (путь выходного файла, если указан --out);
summary.counts — число событий по статусам (changed, unchanged, skipped, warning, error),
summary.ok — нет ошибок и проваленных вердиктов.
Учётные данные берутся только для систем, нужных заданию; для CSV Google не нужен.
Нет учётных данных системы — событие error с details.code = CREDENTIALS_MISSING.
Источник не найден или на листе нет параметра task — ошибка TASK_SOURCE_INVALID.
Задание, пишущее на лист (ExportTechnologyCards, в save), при CSV-источнике без --out ничего не пишет:
событие warning, в details.range — диапазон, в details.values — значения блока CSV-текстом.
--out с URL Google Таблицы или совпадающий с входным файлом — ошибка USAGE_ERROR (код выхода 2).

Примеры:
  $ npm run -s cli -- task run task.csv
  $ npm run -s cli -- task run task.csv --json
  $ npm run -s cli -- task run export.csv --save --out result.csv --json
  $ npm run -s cli -- task run "https://docs.google.com/spreadsheets/d/<id>/edit#gid=<sheetId>" --save --json`,
    )
    .action((source: string, options: { save?: boolean; out?: string }, command: Command) =>
      runCommandAsync(context, command, async () => {
        const mode: TaskRunMode = options.save ? 'save' : 'try'
        // В human-режиме лог выводится по мере выполнения, как в web.
        const liveLog = outputMode(command) === 'human' ? (line: string) => context.streams.stdout(line + '\n') : null
        return taskRunAsync(context.credentials, source, mode, options.out ?? null, liveLog)
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
  out: string | null,
  liveLog: ((line: string) => void) | null,
): Promise<CommandOutput> {
  if (out !== null) {
    checkOutPath(source, out)
  }

  const collector = new TaskEventCollector()
  const reporter = liveLog
    ? new TaskReporter(collector.listener, (event) => liveLog(renderTaskEventText(event)))
    : new TaskReporter(collector.listener)

  const { tableSource, outSource } = await openSourceAsync(source, out, reporter)
  const tableTask = await readTaskAsync(tableSource, source)

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

  if (outSource && out !== null) {
    await writeOutFileAsync(outSource, out, tableTask.name, reporter)
  }
  return taskRunOutput(tableTask.name, mode, collector.events, out)
}

// Источник задания. CSV: запись на лист идёт в сетку в памяти (outSource, с --out)
// или превращается в warning (без --out).
async function openSourceAsync(
  source: string,
  out: string | null,
  reporter: TaskReporter,
): Promise<{ tableSource: TableSource; outSource: CsvFileTableSource | null }> {
  if (isGoogleSource(source)) {
    return { tableSource: await googleSourceAsync(source), outSource: null }
  }
  const csvTableSource = csvSource(source)
  return out !== null
    ? { tableSource: csvTableSource, outSource: csvTableSource }
    : { tableSource: new WriteSkippingTableSource(csvTableSource, reporter), outSource: null }
}

// Лист в том виде, каким он стал после записи задания; пишется, даже если задание завершилось ошибкой.
// Ошибка записи — событие error: уже полученные события не теряются.
async function writeOutFileAsync(outSource: CsvFileTableSource, out: string, task: string, reporter: TaskReporter) {
  try {
    writeCsvFile(out, await outSource.readGridAsync())
  } catch (e) {
    const error = toCliError(e)
    reporter.error(task, `Не удалось записать ${out}: ${error.message}`, {
      details: eventDetails(error.code, { ...error.details, out }),
    })
  }
}

/**
 * Результат `task run`: `{ task, mode, events, summary }` и `out`, если указан `--out`;
 * итог команды — `summary.ok`.
 */
export function taskRunOutput(
  task: string,
  mode: TaskRunMode,
  events: TaskEvent[],
  out: string | null = null,
): CommandOutput {
  const summary = summarizeTaskEvents(events)
  const counts = Object.entries(summary.counts)
    .map(([status, count]) => `${status} ${count}`)
    .join(', ')
  const verdicts = summary.verdicts.failed > 0 ? `; failed verdicts ${summary.verdicts.failed}` : ''
  const message = `${task} (${mode}): ${summary.ok ? 'выполнено' : 'есть ошибки'}. ${counts}${verdicts}.`
  return { ok: summary.ok, message, result: { task, mode, ...(out !== null ? { out } : {}), events, summary } }
}

function isGoogleSource(source: string): boolean {
  return /^https?:\/\//i.test(source)
}

// --out: только для CSV-источника и не на месте входного файла.
function checkOutPath(source: string, out: string) {
  if (isGoogleSource(source)) {
    throw new CliError('USAGE_ERROR', '--out поддерживается только для CSV-источника: Google-лист пишется сам.', {
      option: '--out',
      reason: 'google-source',
    })
  }
  if (isSamePath(source, out)) {
    throw new CliError('USAGE_ERROR', '--out совпадает с входным файлом: входной CSV не изменяется.', {
      option: '--out',
      reason: 'same-as-source',
    })
  }
}

// Один и тот же файл: совпадают нормализованные абсолютные пути или, если оба файла есть, их dev + ino.
// Второе ловит символические и жёсткие ссылки и регистронезависимые файловые системы (Windows, macOS).
function isSamePath(a: string, b: string): boolean {
  if (path.resolve(a) === path.resolve(b)) return true
  const [first, second] = [a, b].map((p) => fs.statSync(p, { bigint: true, throwIfNoEntry: false }))
  return !!first && !!second && first.dev === second.dev && first.ino === second.ino
}

async function readTaskAsync(tableSource: TableSource, source: string): Promise<TableTask> {
  const tableTask = await readTableTaskAsync(tableSource)
  if (!tableTask) {
    throw new CliError('TASK_SOURCE_INVALID', 'На листе нет задания: не заполнен параметр task ($keys / $values).', {
      source,
      reason: 'no-task',
    })
  }
  return tableTask
}

function csvSource(filePath: string): CsvFileTableSource {
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
