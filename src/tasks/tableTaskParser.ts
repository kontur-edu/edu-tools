import { normalizeString } from '../helpers/tools'

// Разбор табличного задания по сетке значений листа (см. Table task format).
// Чистая функция: не зависит от источника (Google, CSV, in-memory), поэтому источники не расходятся.

export interface TableRow {
  [k: string]: string
}

export interface TableTaskData {
  name: string
  params: TableRow
  rows: TableRow[]
  rowsByNamespace: { [namespace: string]: TableRow[] }
  columns: { [key: string]: number }
}

// Параметры читаются только из первых 100 строк листа, включая заголовок.
const PARAMETERS_ROW_LIMIT = 100

export function parseTableTask(grid: string[][]): TableTaskData | null {
  const header = grid[0] || []
  const indices = buildIndicesBy(header)
  const { task, ...params } = readParameters(grid.slice(0, PARAMETERS_ROW_LIMIT), indices)
  if (!task) {
    return null
  }

  const rows = readRows(grid.slice(1), indices)
  const { rootNamespace, byNamespace } = distributeRowsByNamespace(rows)
  return {
    name: task,
    params,
    rows: rootNamespace,
    rowsByNamespace: byNamespace,
    columns: indices.columns,
  }
}

interface Indices {
  columns: { [key: string]: number }
  keysIndex: number
  valuesIndex: number
}

function buildIndicesBy(header: string[]): Indices {
  let keysIndex = Number.NaN
  let valuesIndex = Number.NaN
  const columns: { [key: string]: number } = {}
  for (let i = 0; i < header.length; i++) {
    const trimmed = (header[i] ?? '').trim()
    if (!trimmed.startsWith('$')) {
      continue
    }
    const normalized = normalizeString(trimmed)
    if (normalized === 'keys') {
      keysIndex = i
    } else if (normalized === 'values') {
      valuesIndex = i
    } else {
      columns[normalized] = i
    }
  }

  return { columns, keysIndex, valuesIndex }
}

function readParameters(rows: string[][], indices: Indices): TableRow {
  if (Number.isNaN(indices.keysIndex)) {
    return {}
  }

  const result: TableRow = {}
  for (let i = 1; i < rows.length; i++) {
    const key = normalizeString(readCell(rows[i], indices.keysIndex))
    if (!key) {
      break
    }
    result[key] = readCell(rows[i], indices.valuesIndex)
  }

  return result
}

function readRows(rows: string[][], indices: Indices): TableRow[] {
  return rows.map((row) => {
    const rowObject: TableRow = {}
    for (const columnKey in indices.columns) {
      rowObject[columnKey] = readCell(row, indices.columns[columnKey])
    }
    return rowObject
  })
}

// Google обрезает хвостовые пустые ячейки строки, CSV — нет.
// Недостающая ячейка считается пустой, чтобы источники давали одинаковый результат.
function readCell(row: string[] | undefined, index: number): string {
  return (row?.[index] ?? '').trim()
}

function distributeRowsByNamespace(rows: TableRow[]) {
  const rootNamespace: TableRow[] = []
  const byNamespace: { [n: string]: TableRow[] } = {}

  for (const row of rows) {
    const root: TableRow = {}
    const rowByNamespace: { [n: string]: TableRow } = {}

    for (const key in row) {
      const parts = key.split('.')
      if (parts.length === 1) {
        root[key] = row[key]
      } else if (parts.length === 2) {
        if (!rowByNamespace[parts[0]]) rowByNamespace[parts[0]] = {}
        rowByNamespace[parts[0]][parts[1]] = row[key]
      }
    }

    if (isFilled(root)) {
      rootNamespace.push(root)
    }
    for (const n of Object.keys(rowByNamespace)) {
      const r = rowByNamespace[n]
      if (isFilled(r)) {
        byNamespace[n] = byNamespace[n] || []
        byNamespace[n].push(r)
      }
    }
  }

  return { rootNamespace, byNamespace }
}

function isFilled(row: TableRow) {
  return Object.values(row).some((value) => value !== '' && value !== undefined)
}
