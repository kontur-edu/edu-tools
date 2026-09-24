import * as fs from 'fs'
import { parseCsv } from '../helpers/csv.js'
import { TableSource } from '../tasks/TableSource.js'

// Только Node: чтение CSV-файлов через fs (см. Table sources, architecture guardrails п. 2).

export function readCsvFile(filePath: string): string[][] {
  return parseCsv(fs.readFileSync(filePath, 'utf8'))
}

// CSV-файл как источник задания. Входной файл только читается.
export class CsvFileTableSource implements TableSource {
  filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  async readGridAsync(): Promise<string[][]> {
    return readCsvFile(this.filePath)
  }

  async writeBlockAsync(): Promise<void> {
    // Запись результата в отдельный файл (--out) — FT-0018.
    throw new Error('Запись на лист не поддерживается для CSV-источника')
  }
}
