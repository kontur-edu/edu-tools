import { getSheetNameAsync, GoogleApi, parseSpreadsheetUrl } from '../apis/GoogleApi'
import { normalizeString } from '../helpers/tools'
import { parseTableTask, TableRow, TableTaskData } from './tableTaskParser'
import { GoogleSheetTableSource, TableSource } from './TableSource'

// Пишет на лист, из которого прочитано задание.
export class TableTaskWriter {
  async batchWriteAsync(tableTask: TableTask, leftIndex: number, topIndex: number, values: unknown[][]) {
    await tableTask.source.writeBlockAsync(leftIndex, topIndex, values)
  }
}

export async function readTableTaskAsync(source: TableSource): Promise<TableTask | null> {
  const data = parseTableTask(await source.readGridAsync())
  return data ? new TableTask(data, source) : null
}

// Чтение задания из Google Таблицы по URL или имени листа.
export class TableTaskReader {
  googleApi: GoogleApi

  constructor(googleApi: GoogleApi) {
    this.googleApi = googleApi
  }

  async readTaskByUrlAsync(spreadsheetUrl: string): Promise<TableTask | null> {
    const { spreadsheetId, sheetId } = parseSpreadsheetUrl(spreadsheetUrl) || {}
    if (!spreadsheetId) {
      return null
    }
    const sheetName = sheetId ? await getSheetNameAsync(this.googleApi, spreadsheetId, sheetId) : null
    if (!sheetName) {
      return null
    }

    return this.readTaskBySheetNameAsync(spreadsheetId, sheetName)
  }

  async readTaskBySheetNameAsync(spreadsheetId: string, sheetName: string): Promise<TableTask | null> {
    return readTableTaskAsync(new GoogleSheetTableSource(this.googleApi, spreadsheetId, sheetName))
  }
}

export class TableTask {
  name: string
  params: TableRow
  rows: TableRow[]
  rowsByNamespace: { [namespace: string]: TableRow[] }
  columns: { [key: string]: number }
  // Лист, из которого прочитано задание; туда же пишут задания с выводом на лист.
  source: TableSource

  constructor(data: TableTaskData, source: TableSource) {
    this.name = data.name
    this.params = data.params
    this.rows = data.rows
    this.rowsByNamespace = data.rowsByNamespace
    this.columns = data.columns
    this.source = source
  }

  getParam(name: string): TableTaskValue {
    return TableTaskValue.extract(this.params, name)
  }
}

export class TableTaskValue {
  value: string

  constructor(value: string) {
    this.value = value
  }

  getString(): string | null {
    return this.getCustom(extractString)
  }

  getInt(): number | null {
    return this.getCustom(extractInt)
  }

  getIntArray(): Array<number> | null {
    return this.getCustom(extractIntArray)
  }

  getBool(): boolean | null {
    return this.getCustom(extractBool)
  }

  getCustom<T>(process: (it: string) => T | null): T | null {
    return this.get<T | null>(process, null)
  }

  get<T>(process: (it: string) => T, defaultValue: T) {
    // Пустая ячейка — отсутствующее значение, где бы она ни стояла в строке.
    if (this.value === undefined || this.value === '') return defaultValue
    try {
      const processedValue = process(this.value)
      return processedValue !== undefined ? processedValue : defaultValue
    } catch (e) {
      return defaultValue
    }
  }

  static extract(row: TableRow, name: string) {
    const value = row[normalizeString(name)]
    return new TableTaskValue(value)
  }
}

function extractIntArray(it: string): Array<number> {
  return it.split(',').map((p) => parseInt(p.trim(), 10))
}

function extractBool(it: string): boolean {
  if (it.toLowerCase() === 'true') return true
  if (it.toLowerCase() === 'false') return false
  return !!parseInt(it, 10)
}

function extractInt(it: string): number {
  return parseInt(it, 10)
}

function extractString(it: string): string {
  return it
}
