import { GoogleApi } from '../apis/GoogleApi.js'
import { normalizeString } from '../helpers/tools.js'

export class TableTaskWriter {
  googleApi: GoogleApi
  spreadsheetId: string
  sheetName: string

  constructor(googleApi: GoogleApi, spreadsheetId: string, sheetName: string) {
    this.googleApi = googleApi
    this.spreadsheetId = spreadsheetId
    this.sheetName = sheetName
  }

  async batchWriteAsync(leftIndex: number, topIndex: number, values: any[][]) {
    if (values.length < 1) {
      return
    }
    const width = values[0].length

    const batchSize = 50
    for (let i = 0; i < values.length; ) {
      const batch = values.slice(i, i + batchSize)
      await this.writeAsync(leftIndex, leftIndex + width - 1, topIndex + i, batch)
      i += batch.length
    }
  }

  async writeAsync(leftIndex: number, rightIndex: number, topIndex: number, values: any[][]): Promise<void> {
    const sheet = this.googleApi.openSpreadsheet(this.spreadsheetId)
    const range = buildDataRange(this.sheetName, leftIndex, rightIndex, topIndex)
    await sheet.writeAsync(range, values)
  }
}

export class TableTaskReader {
  googleApi: GoogleApi

  constructor(googleApi: GoogleApi) {
    this.googleApi = googleApi
  }

  async readTaskAsync(spreadsheetId: string, sheetName: string): Promise<TableTask | null> {
    const headRows = await readHeadRowsFromSpreadsheetAsync(this.googleApi, spreadsheetId, sheetName)
    const header = getHeader(headRows)
    const indices = buildIndicesBy(header)
    const { task, ...params } = readParameters(headRows, indices)
    const rows = await readRowsAsync(this.googleApi, spreadsheetId, sheetName, indices)
    const namespacedRows = distributeRowsByNamespace(rows)
    return task ? new TableTask(task, params, namespacedRows, indices) : null
  }
}

async function readHeadRowsFromSpreadsheetAsync(googleApi: GoogleApi, spreadsheetId: string, sheetName: string) {
  const sheet = googleApi.openSpreadsheet(spreadsheetId)
  const rows = (await sheet.readAsync(sheetName + '!A1:ZZ100')).values as string[][]
  return rows || null
}

function getHeader(rows: string[][]): string[] {
  const header = rows && rows[0]
  return header || []
}

function buildIndicesBy(header: string[]): Indices {
  let leftIndex = Number.POSITIVE_INFINITY
  let rightIndex = Number.NEGATIVE_INFINITY
  let keysIndex = Number.NaN
  let valuesIndex = Number.NaN
  const columns: { [key: string]: number } = {}
  for (let i = 0; i < header.length; i++) {
    const trimmed = header[i].trim()
    const normalized = normalizeString(header[i])
    if (trimmed.startsWith('$')) {
      if (normalized === 'keys') {
        keysIndex = i
      } else if (normalized === 'values') {
        valuesIndex = i
      } else {
        columns[normalized] = i
        if (i < leftIndex) {
          leftIndex = i
        }
        if (rightIndex < i) {
          rightIndex = i
        }
      }
    }
  }

  return {
    columns,
    keysIndex,
    valuesIndex,
    leftIndex,
    rightIndex,
  }
}

function readParameters(rows: string[][], indices: Indices): { [key: string]: string } {
  if (indices.keysIndex === Number.NaN || indices.valuesIndex === Number.NaN) {
    return {}
  }

  const result: { [key: string]: string } = {}
  for (let i = 1; i < rows.length; i++) {
    const key = normalizeString(rows[i][indices.keysIndex])
    if (!key) {
      break
    }
    const value = rows[i][indices.valuesIndex]?.trim()
    result[key] = value
  }

  return result
}

async function readRowsAsync(
  googleApi: GoogleApi,
  spreadsheetId: string,
  sheetName: string,
  indices: Indices,
): Promise<Row[]> {
  const sheet = googleApi.openSpreadsheet(spreadsheetId)
  const range = buildDataRange(sheetName, indices.leftIndex, indices.rightIndex)
  const rows = (await sheet.readAsync(range)).values || []

  const result: { [key: string]: string }[] = []
  for (const row of rows) {
    const rowObject: { [key: string]: string } = {}
    for (let columnKey in indices.columns) {
      const columnIndex = indices.columns[columnKey] - indices.leftIndex
      const columnValue = row[columnIndex]?.trim()
      rowObject[columnKey] = columnValue
    }
    result.push(rowObject)
  }
  return result
}

function distributeRowsByNamespace(rows: Row[]): NamespacedRows {
  const result: NamespacedRows = {
    rootNamespace: [],
    byNamespace: {},
  }

  for (const row of rows) {
    const root: Row = {}
    const byNamespace: { [n: string]: Row } = {}

    for (let key in row) {
      const parts = key.split('.')
      if (parts.length === 1) {
        root[key] = row[key]
      } else if (parts.length === 2) {
        if (!byNamespace[parts[0]]) byNamespace[parts[0]] = {}
        byNamespace[parts[0]][parts[1]] = row[key]
      }
    }

    if (isFilled(root)) {
      result.rootNamespace.push(root)
    }
    for (const n of Object.keys(byNamespace)) {
      const r = byNamespace[n]
      if (isFilled(r)) {
        result.byNamespace[n] = result.byNamespace[n] || []
        if (!result.byNamespace[n]) result.byNamespace[n] = []
        result.byNamespace[n].push(r)
      }
    }
  }

  return result

  function isFilled(r: Row) {
    return Object.values(r).reduce((acc, value) => acc || (value !== '' && value !== undefined), false)
  }
}

function buildDataRange(sheetName: string, leftIndex: number, rightIndex: number, topIndex: number = 1) {
  if (!Number.isFinite(leftIndex) || !Number.isFinite(rightIndex)) {
    return `${sheetName}!A${topIndex + 1}:A`
  }

  const leftLetter = index2letter(leftIndex)
  const rightLetter = index2letter(rightIndex)
  return `${sheetName}!${leftLetter}${topIndex + 1}:${rightLetter}`
}

function index2letter(index: number) {
  const size = 'Z'.charCodeAt(0) - 'A'.charCodeAt(0) + 1
  const big = Math.floor(index / size)
  const little = index % size

  return big > 0
    ? String.fromCharCode('A'.charCodeAt(0) + (big - 1)) + String.fromCharCode('A'.charCodeAt(0) + little)
    : String.fromCharCode('A'.charCodeAt(0) + little)
}

interface Indices {
  columns: { [key: string]: number }
  keysIndex: number
  valuesIndex: number
  leftIndex: number
  rightIndex: number
}

export class TableTask {
  name: string
  params: { [key: string]: string }
  rows: { [key: string]: string }[]
  rowsByNamespace: { [namespace: string]: { [key: string]: string }[] }
  columns: { [key: string]: number }

  constructor(name: string, params: { [key: string]: string }, namespacedRows: NamespacedRows, indices: Indices) {
    this.name = name
    this.params = params
    this.rows = namespacedRows.rootNamespace
    this.rowsByNamespace = namespacedRows.byNamespace
    this.columns = indices.columns
  }

  getStringParam(name: string): string | null {
    return this.getParam(name, (it) => it, null)
  }

  getIntParam(name: string): number | null {
    return this.getParam(name, (it) => parseInt(it, 10), null)
  }

  getIntArrayParam(name: string): Array<number> | null {
    return this.getParam(name, (it) => it.split(',').map(p => parseInt(p.trim(), 10)), null)
  }

  getBoolParam(name: string): boolean | null {
    return this.getParam(
      name,
      (it) => {
        if (it.toLowerCase() === 'true') return true
        if (it.toLowerCase() === 'false') return false
        return !!parseInt(it, 10)
      },
      null,
    )
  }

  getCustomParam<T>(name: string, process: (it: string) => T | null): T | null {
    return this.getParam<T | null>(name, process, null)
  }

  getParam<T>(name: string, process: (it: string) => T, defaultValue: T) {
    const value = this.params[normalizeString(name)]
    if (value === undefined) return defaultValue
    try {
      const processedValue = process(value)
      return processedValue !== undefined ? processedValue : defaultValue
    } catch (e) {
      return defaultValue
    }
  }
}

interface NamespacedRows {
  rootNamespace: Row[]
  byNamespace: { [n: string]: Row[] }
}

interface Row {
  [k: string]: string
}
