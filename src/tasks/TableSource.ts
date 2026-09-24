import { GoogleApi } from '../apis/GoogleApi'

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

// Сетка в памяти: для unit-тестов.
export class InMemoryTableSource implements TableSource {
  grid: string[][]

  constructor(grid: string[][]) {
    this.grid = grid
  }

  async readGridAsync(): Promise<string[][]> {
    return this.grid
  }

  async writeBlockAsync(): Promise<void> {
    // Запись в сетку в памяти появится вместе с --out для CSV (FT-0018).
    throw new Error('Запись на лист не поддерживается для in-memory источника')
  }
}

function quoteSheetName(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`
}

function buildRange(sheetName: string, leftIndex: number, rightIndex: number, topIndex: number) {
  const top = topIndex + 1
  return `${quoteSheetName(sheetName)}!${index2letter(leftIndex)}${top}:${index2letter(rightIndex)}`
}

function index2letter(index: number) {
  const size = 'Z'.charCodeAt(0) - 'A'.charCodeAt(0) + 1
  const big = Math.floor(index / size)
  const little = index % size

  return big > 0
    ? String.fromCharCode('A'.charCodeAt(0) + (big - 1)) + String.fromCharCode('A'.charCodeAt(0) + little)
    : String.fromCharCode('A'.charCodeAt(0) + little)
}
