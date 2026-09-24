import { TableSource } from './TableSource'

// Converter (Table sources, «Конвертация»): сетка значений одного источника записывается в другой
// через порт TableSource. От Google API не зависит: чтение отображаемых значений и запись RAW
// обеспечивает Google-реализация порта.

/** Целевой лист не пуст, а перезапись не разрешена. Бросается до какой-либо записи. */
export class TableNotEmptyError extends Error {
  constructor() {
    super('Целевой лист не пуст.')
    this.name = 'TableNotEmptyError'
  }
}

export type ConvertTableOptions = {
  /** Разрешить запись в непустой лист; старые ячейки за пределами новой сетки очищаются. */
  overwrite: boolean
}

/**
 * Копирует сетку `from` в `to` с ячейки A1 одним блоком. Строки выравниваются до одной ширины
 * (недостающая ячейка — `''`). Возвращает размер скопированной сетки.
 */
export async function convertTableAsync(
  from: TableSource,
  to: TableSource,
  options: ConvertTableOptions,
): Promise<{ rows: number; columns: number }> {
  const grid = await from.readGridAsync()
  const target = await to.readGridAsync()
  if (!options.overwrite && target.some((row) => row.some((value) => value !== ''))) {
    throw new TableNotEmptyError()
  }

  const rows = grid.length
  const columns = maxWidth(grid)
  // При перезаписи блок покрывает и старую сетку: пустые строки очищают лишние ячейки.
  const height = options.overwrite ? Math.max(rows, target.length) : rows
  const width = options.overwrite ? Math.max(columns, maxWidth(target)) : columns
  if (height > 0 && width > 0) {
    const block = Array.from({ length: height }, (_, r) => Array.from({ length: width }, (_, c) => grid[r]?.[c] ?? ''))
    await to.writeBlockAsync(0, 0, block)
  }
  return { rows, columns }
}

function maxWidth(grid: string[][]): number {
  return Math.max(0, ...grid.map((row) => row.length))
}
