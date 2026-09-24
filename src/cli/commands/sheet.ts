import { Command } from 'commander'
import { writeCsvFile } from '../../apis/NodeCsvFile.js'
import { convertTableAsync, TableNotEmptyError } from '../../tasks/TableConverter.js'
import { InMemoryTableSource } from '../../tasks/TableSource.js'
import { CliError } from '../errors.js'
import { CommandOutput } from '../output.js'
import { CliContext, runCommandAsync } from '../runCommand.js'
import { openCsvFile, openGoogleSheetAsync, parseSheetUrl } from '../sources.js'

const exampleUrl = 'https://docs.google.com/spreadsheets/d/<id>/edit#gid=<sheetId>'
const sheetUrlHelp = `URL листа Google Таблицы: ${exampleUrl}`

export function registerSheetCommands(program: Command, context: CliContext) {
  const sheet = program
    .command('sheet')
    .description('Конвертация листа Google Таблицы ⇄ CSV-файл (converter, Table sources)')
    .addHelpText(
      'after',
      `
Примеры:
  $ npm run -s cli -- sheet export "${exampleUrl}" task.csv
  $ npm run -s cli -- sheet import result.csv "${exampleUrl}"`,
    )

  sheet
    .command('export')
    .description(
      'Выгрузить отображаемые значения всего листа в CSV-файл (формулы и форматирование теряются). ' +
        'Существующий файл перезаписывается. Нужны сохранённые токены Google (google login).',
    )
    .argument('<sheetUrl>', sheetUrlHelp)
    .argument('<file.csv>', 'путь выходного CSV-файла')
    .addHelpText(
      'after',
      `
Результат --json: { sheet, file, rows, columns } — размер выгруженной сетки.
Строки выравниваются до одной ширины; CSV — UTF-8 без BOM, разделитель «,», строка завершается \\n.
URL без #gid= или нет такого листа — ошибка TASK_SOURCE_INVALID.

Примеры:
  $ npm run -s cli -- sheet export "${exampleUrl}" task.csv
  $ npm run -s cli -- sheet export "${exampleUrl}" task.csv --json`,
    )
    .action((url: string, file: string, _options: unknown, command: Command) =>
      runCommandAsync(context, command, () => sheetExportAsync(context, url, file)),
    )

  sheet
    .command('import')
    .description(
      'Загрузить CSV-файл на лист Google Таблицы с ячейки A1: значения записываются как есть (RAW), ' +
        '2024/2025 и «1, 2» остаются строками. Непустой лист перезаписывается только с --overwrite.',
    )
    .argument('<file.csv>', 'путь входного CSV-файла')
    .argument('<sheetUrl>', sheetUrlHelp)
    .option('--overwrite', 'перезаписать непустой лист; старые значения за пределами новой сетки очищаются')
    .addHelpText(
      'after',
      `
Результат --json: { file, sheet, overwrite, rows, columns } — размер загруженной сетки.
Непустой лист без --overwrite — ошибка SHEET_NOT_EMPTY, лист не изменяется.
Форматирование листа не меняется, очищаются только значения.
Нет файла, URL без #gid= или нет такого листа — ошибка TASK_SOURCE_INVALID.

Примеры:
  $ npm run -s cli -- sheet import result.csv "${exampleUrl}"
  $ npm run -s cli -- sheet import result.csv "${exampleUrl}" --overwrite --json`,
    )
    .action((file: string, url: string, options: { overwrite?: boolean }, command: Command) =>
      runCommandAsync(context, command, () => sheetImportAsync(context, file, url, !!options.overwrite)),
    )
}

async function sheetExportAsync(context: CliContext, url: string, file: string): Promise<CommandOutput> {
  const sheet = await openGoogleSheetAsync(context, url)
  const csv = new InMemoryTableSource([])
  const { rows, columns } = await convertTableAsync(sheet, csv, { overwrite: true })
  writeCsvFile(file, csv.grid)
  return {
    ok: true,
    message: `Лист выгружен в ${file}: строк ${rows}, колонок ${columns}.`,
    result: { sheet: url, file, rows, columns },
  }
}

async function sheetImportAsync(
  context: CliContext,
  file: string,
  url: string,
  overwrite: boolean,
): Promise<CommandOutput> {
  // Аргументы проверяются до обращения к Google.
  parseSheetUrl(url)
  const csv = openCsvFile(file)
  const sheet = await openGoogleSheetAsync(context, url)
  try {
    const { rows, columns } = await convertTableAsync(csv, sheet, { overwrite })
    return {
      ok: true,
      message: `${file} загружен на лист: строк ${rows}, колонок ${columns}.`,
      result: { file, sheet: url, overwrite, rows, columns },
    }
  } catch (e) {
    if (!(e instanceof TableNotEmptyError)) throw e
    throw new CliError('SHEET_NOT_EMPTY', 'Лист не пуст: укажите --overwrite, чтобы перезаписать его.', {
      sheet: url,
      option: '--overwrite',
    })
  }
}
