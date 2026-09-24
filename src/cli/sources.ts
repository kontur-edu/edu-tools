import * as fs from 'fs'
import { parseSpreadsheetUrl } from '../apis/GoogleApi.js'
import { CsvFileTableSource } from '../apis/NodeCsvFile.js'
import { GoogleSheetTableSource } from '../tasks/TableSource.js'
import { CliError } from './errors.js'
import { CliContext } from './runCommand.js'

// Источники-листы из аргументов команд (task run, sheet export, sheet import): URL листа Google Таблицы
// или путь к CSV-файлу. Ошибки — TASK_SOURCE_INVALID с details.source и details.reason.

export function looksLikeUrl(source: string): boolean {
  return /^https?:\/\//i.test(source)
}

/** Таблица и лист из URL; без `#gid=` — `TASK_SOURCE_INVALID` (`bad-url`) до обращения к Google. */
export function parseSheetUrl(url: string): { spreadsheetId: string; sheetId: string } {
  const { spreadsheetId, sheetId } = parseSpreadsheetUrl(url) ?? {}
  if (!spreadsheetId || !sheetId) {
    throw new CliError(
      'TASK_SOURCE_INVALID',
      'Нужен URL листа Google Таблицы вида https://docs.google.com/spreadsheets/d/<id>/edit#gid=<sheetId>.',
      { source: url, reason: 'bad-url' },
    )
  }
  return { spreadsheetId, sheetId }
}

/** Лист Google Таблицы по URL; нет листа с таким `gid` — `TASK_SOURCE_INVALID` (`sheet-not-found`). */
export async function openGoogleSheetAsync(context: CliContext, url: string): Promise<GoogleSheetTableSource> {
  const { spreadsheetId, sheetId } = parseSheetUrl(url)
  const googleApi = await context.googleApiAsync()
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

/** CSV-файл как источник; нет файла — `TASK_SOURCE_INVALID` (`not-found`). */
export function openCsvFile(filePath: string): CsvFileTableSource {
  if (!fs.existsSync(filePath)) {
    throw new CliError('TASK_SOURCE_INVALID', `Файл ${filePath} не найден.`, { source: filePath, reason: 'not-found' })
  }
  return new CsvFileTableSource(filePath)
}
