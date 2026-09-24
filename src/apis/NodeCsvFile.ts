import * as fs from 'fs'
import { formatCsv, parseCsv } from '../helpers/csv.js'
import { TableSource, writeBlockToGrid } from '../tasks/TableSource.js'

// Только Node: чтение и запись CSV-файлов через fs (см. Table sources, architecture guardrails п. 2).

export function readCsvFile(filePath: string): string[][] {
  return parseCsv(fs.readFileSync(filePath, 'utf8'))
}

// Каждая строка сетки, включая последнюю, завершается переводом строки; BOM не добавляется.
export function writeCsvFile(filePath: string, grid: string[][]) {
  fs.writeFileSync(filePath, grid.length > 0 ? formatCsv(grid) + '\n' : '', 'utf8')
}

// CSV-файл как источник задания. Входной файл только читается: запись на лист идёт в сетку в памяти
// (входная сетка + записанные блоки), CLI сохраняет её в выходной файл (--out) через writeCsvFile.
export class CsvFileTableSource implements TableSource {
  filePath: string
  private grid: string[][] | null = null

  constructor(filePath: string) {
    this.filePath = filePath
  }

  // Файл читается один раз; дальше — сетка в памяти вместе с записанными блоками.
  async readGridAsync(): Promise<string[][]> {
    return this.loadGrid()
  }

  async writeBlockAsync(leftIndex: number, topIndex: number, values: unknown[][]): Promise<void> {
    this.grid = writeBlockToGrid(this.loadGrid(), leftIndex, topIndex, values)
  }

  private loadGrid(): string[][] {
    if (!this.grid) {
      this.grid = readCsvFile(this.filePath)
    }
    return this.grid
  }
}
