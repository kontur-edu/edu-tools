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
  // Дополнительные колонки ($$, ADR-0006): заголовки слева направо, без нормализации, с повторами.
  extraColumns: string[]
  // Значения $$-колонок: extraValues[i] относится к rows[i], порядок — как в extraColumns.
  extraValues: string[][]
}

// Параметры читаются только из первых 100 строк листа, включая заголовок.
const PARAMETERS_ROW_LIMIT = 100

const EXTRA_COLUMN_PREFIX = '$$'

export function parseTableTask(grid: string[][]): TableTaskData | null {
  const header = grid[0] || []
  const indices = buildIndicesBy(header)
  const { task, ...params } = readParameters(grid.slice(0, PARAMETERS_ROW_LIMIT), indices)
  if (!task) {
    return null
  }

  const rows = readRows(grid.slice(1), indices)
  const { rootNamespace, extraValues, byNamespace } = distributeRowsByNamespace(rows)
  return {
    name: task,
    params,
    rows: rootNamespace,
    rowsByNamespace: byNamespace,
    columns: indices.columns,
    extraColumns: indices.extraColumns.map((it) => it.name),
    extraValues,
  }
}

interface Indices {
  columns: { [key: string]: number }
  extraColumns: { name: string; index: number }[]
  keysIndex: number
  valuesIndex: number
}

function buildIndicesBy(header: string[]): Indices {
  let keysIndex = Number.NaN
  let valuesIndex = Number.NaN
  const columns: { [key: string]: number } = {}
  const extraColumns: { name: string; index: number }[] = []
  for (let i = 0; i < header.length; i++) {
    const trimmed = (header[i] ?? '').trim()
    if (trimmed.startsWith(EXTRA_COLUMN_PREFIX)) {
      const name = trimmed.substring(EXTRA_COLUMN_PREFIX.length).trim()
      if (name) {
        extraColumns.push({ name, index: i })
      }
      continue
    }
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

  return { columns, extraColumns, keysIndex, valuesIndex }
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

interface RawRow {
  values: TableRow
  extraValues: string[]
}

function readRows(rows: string[][], indices: Indices): RawRow[] {
  return rows.map((row) => {
    const values: TableRow = {}
    for (const columnKey in indices.columns) {
      values[columnKey] = readCell(row, indices.columns[columnKey])
    }
    const extraValues = indices.extraColumns.map((it) => readCell(row, it.index))
    return { values, extraValues }
  })
}

// Google обрезает хвостовые пустые ячейки строки, CSV — нет.
// Недостающая ячейка считается пустой, чтобы источники давали одинаковый результат.
function readCell(row: string[] | undefined, index: number): string {
  return (row?.[index] ?? '').trim()
}

function distributeRowsByNamespace(rows: RawRow[]) {
  const rootNamespace: TableRow[] = []
  const extraValues: string[][] = []
  const byNamespace: { [n: string]: TableRow[] } = {}

  for (const row of rows) {
    const root: TableRow = {}
    const rowByNamespace: { [n: string]: TableRow } = {}

    for (const key in row.values) {
      const parts = key.split('.')
      if (parts.length === 1) {
        root[key] = row.values[key]
      } else if (parts.length === 2) {
        if (!rowByNamespace[parts[0]]) rowByNamespace[parts[0]] = {}
        rowByNamespace[parts[0]][parts[1]] = row.values[key]
      }
    }

    // $$-колонки относятся к корневым строкам: строка пустая, только если пусты и $-, и $$-значения.
    if (isFilled(Object.values(root)) || isFilled(row.extraValues)) {
      rootNamespace.push(root)
      extraValues.push(row.extraValues)
    }
    for (const n of Object.keys(rowByNamespace)) {
      const r = rowByNamespace[n]
      if (isFilled(Object.values(r))) {
        byNamespace[n] = byNamespace[n] || []
        byNamespace[n].push(r)
      }
    }
  }

  return { rootNamespace, extraValues, byNamespace }
}

function isFilled(values: string[]) {
  return values.some((value) => value !== '' && value !== undefined)
}
