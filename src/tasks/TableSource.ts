import { GoogleApi } from '../apis/GoogleApi'
import { formatCsv } from '../helpers/csv'
import { TaskReporter } from './TaskReporter'

// Порт источника табличного задания: один лист как сетка значений (см. Table sources).
// Разбор разметки сюда не входит — он в tableTaskParser и одинаков для всех источников.
export interface TableSource {
  // Все значения листа: строка 1 — заголовок. Строки могут быть разной длины.
  readGridAsync(): Promise<string[][]>
  // Записать блок значений, левый верхний угол — (leftIndex, topIndex), индексы с 0.
  writeBlockAsync(leftIndex: number, topIndex: number, values: unknown[][]): Promise<void>
}

// Лист Google Таблицы. Работает и в браузере, и в Node — через переданный GoogleApi.
export class GoogleSheetTableSource implements TableSource {
  googleApi: GoogleApi
  spreadsheetId: string
  sheetName: string

  constructor(googleApi: GoogleApi, spreadsheetId: string, sheetName: string) {
    this.googleApi = googleApi
    this.spreadsheetId = spreadsheetId
    this.sheetName = sheetName
  }

  async readGridAsync(): Promise<string[][]> {
    const sheet = this.googleApi.openSpreadsheet(this.spreadsheetId)
    // Весь лист одним запросом.
    const rows = (await sheet.readAsync(quoteSheetName(this.sheetName))).values as string[][] | undefined
    return rows || []
  }

  async writeBlockAsync(leftIndex: number, topIndex: number, values: unknown[][]): Promise<void> {
    if (values.length < 1) {
      return
    }
    const width = values[0].length
    const sheet = this.googleApi.openSpreadsheet(this.spreadsheetId)

    const batchSize = 50
    for (let i = 0; i < values.length; ) {
      const batch = values.slice(i, i + batchSize)
      const range = buildRange(this.sheetName, leftIndex, leftIndex + width - 1, topIndex + i)
      await sheet.writeAsync(range, batch)
      i += batch.length
    }
  }
}

// Сетка в памяти (unit-тесты). Запись меняет сетку так же, как запись меняет лист Google.
export class InMemoryTableSource implements TableSource {
  grid: string[][]

  constructor(grid: string[][]) {
    this.grid = grid
  }

  async readGridAsync(): Promise<string[][]> {
    return this.grid
  }

  async writeBlockAsync(leftIndex: number, topIndex: number, values: unknown[][]): Promise<void> {
    this.grid = writeBlockToGrid(this.grid, leftIndex, topIndex, values)
  }
}

// Источник, который не пишет на лист: читает сетку другого источника, а вместо записи выдаёт событие
// warning с диапазоном и значениями блока (CSV-текстом). CLI: CSV-источник без --out (FT-0018).
export class WriteSkippingTableSource implements TableSource {
  source: TableSource
  reporter: TaskReporter

  constructor(source: TableSource, reporter: TaskReporter) {
    this.source = source
    this.reporter = reporter
  }

  readGridAsync(): Promise<string[][]> {
    return this.source.readGridAsync()
  }

  async writeBlockAsync(leftIndex: number, topIndex: number, values: unknown[][]): Promise<void> {
    if (values.length < 1) {
      return
    }
    const range = blockRange(leftIndex, topIndex, values)
    this.reporter.warning(
      range,
      `Запись на лист (${range}) не выполнена: укажите --out <file.csv>, чтобы сохранить результат.`,
      { range, values: formatCsv(values.map((row) => row.map((value) => toCellText(value) ?? ''))) },
    )
  }
}

// Сетка после записи блока с позиции (leftIndex, topIndex), как её покажет лист Google (запись RAW).
// Входная сетка не меняется. Результат прямоугольный: сетка расширяется до блока, строки дополняются ''.
export function writeBlockToGrid(
  grid: string[][],
  leftIndex: number,
  topIndex: number,
  values: unknown[][],
): string[][] {
  const height = Math.max(grid.length, values.length > 0 ? topIndex + values.length : 0)
  const width = Math.max(0, ...grid.map((row) => row.length), ...values.map((row) => leftIndex + row.length))
  const result = Array.from({ length: height }, (_, r) => Array.from({ length: width }, (_, c) => grid[r]?.[c] ?? ''))
  values.forEach((row, r) =>
    row.forEach((value, c) => {
      result[topIndex + r][leftIndex + c] = toCellText(value) ?? result[topIndex + r][leftIndex + c]
    }),
  )
  return result
}

// Текст ячейки после записи значения, как его покажет Google (RAW); null — ячейка не меняется,
// как у Sheets API.
function toCellText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function quoteSheetName(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`
}

// Диапазон блока в A1-нотации без имени листа: D1:L3. Ширина — по самой длинной строке блока.
function blockRange(leftIndex: number, topIndex: number, values: unknown[][]) {
  const rightIndex = leftIndex + Math.max(1, ...values.map((row) => row.length)) - 1
  const bottom = topIndex + values.length
  return `${index2letter(leftIndex)}${topIndex + 1}:${index2letter(rightIndex)}${bottom}`
}

function buildRange(sheetName: string, leftIndex: number, rightIndex: number, topIndex: number) {
  const top = topIndex + 1
  return `${quoteSheetName(sheetName)}!${index2letter(leftIndex)}${top}:${index2letter(rightIndex)}`
}

// Индекс колонки с 0 → буквы A1-нотации: 0 → A, 25 → Z, 26 → AA, 702 → AAA.
function index2letter(index: number) {
  const size = 'Z'.charCodeAt(0) - 'A'.charCodeAt(0) + 1
  let letters = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / size)) {
    letters = String.fromCharCode('A'.charCodeAt(0) + ((n - 1) % size)) + letters
  }
  return letters
}
