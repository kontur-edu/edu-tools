import { GoogleApi } from '../apis/GoogleApi.js'
import { normalizeString } from '../helpers/tools.js'

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
    return task ? new TableTask(task, params, rows) : null
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
): Promise<{ [key: string]: string }[]> {
  const sheet = googleApi.openSpreadsheet(spreadsheetId)
  const range = buildDataRange(sheetName, indices)
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

function buildDataRange(sheetName: string, indices: Indices) {
  if (!Number.isFinite(indices.leftIndex) || !Number.isFinite(indices.rightIndex)) {
    return `${sheetName}!A2:A`
  }
  const leftLetter = String.fromCharCode('A'.charCodeAt(0) + indices.leftIndex)
  const rightLetter = String.fromCharCode('A'.charCodeAt(0) + indices.rightIndex)
  return `${sheetName}!${leftLetter}2:${rightLetter}`
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

  constructor(name: string, params: { [key: string]: string }, rows: { [key: string]: string }[]) {
    this.name = name
    this.params = params
    this.rows = rows
  }

  getStringParam(name: string): string | null {
    return this.getParam(name, (it) => it, null)
  }

  getIntParam(name: string): number | null {
    return this.getParam(name, (it) => parseInt(it, 10), null)
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
