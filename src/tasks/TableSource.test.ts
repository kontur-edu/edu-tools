import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { CsvFileTableSource } from '../apis/NodeCsvFile'
import { GoogleApi, Spreadsheet } from '../apis/GoogleApi'
import { formatCsv } from '../helpers/csv'
import { readTableTaskAsync, TableTask } from './TableTask'
import { GoogleSheetTableSource, InMemoryTableSource } from './TableSource'

// Инвариант Table sources: одна сетка значений из любого источника даёт одинаковый TableTask.

const grid = [
  ['$keys', '$values', 'Комментарий', '$Team', '$Iteration.Name', '$Note', ''],
  ['task', 'CreateTeamProjectIterations', 'свободный текст', 'Команда 1', 'Итерация 1', 'a, b', ''],
  ['academicYear', '2024/2025', '', 'Команда 2', '', 'say "hi"', ''],
  ['semester', '', '', 'Команда 3', '', '', ''],
  ['', '', '', '', '', '', ''],
  ['', '', '', '', 'Итерация 2', 'line1\nline2', ''],
  ['', '', '', '', '', '', ''],
]

describe('TableSource', () => {
  const tempDirs: string[] = []
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
  })

  function writeTempCsv(text: string) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edu-tools-csv-'))
    tempDirs.push(dir)
    const filePath = path.join(dir, 'task.csv')
    fs.writeFileSync(filePath, text, 'utf8')
    return filePath
  }

  it('Google, CSV-файл и in-memory источник дают одинаковое задание на одной сетке', async () => {
    const csvText = '﻿' + formatCsv(grid).replace(/,\n/g, ',\r\n') + '\r\n'
    const sources = [
      new InMemoryTableSource(grid),
      new GoogleSheetTableSource(fakeGoogleApi('spreadsheet-1', 'Итерации', grid), 'spreadsheet-1', 'Итерации'),
      new CsvFileTableSource(writeTempCsv(csvText)),
    ]

    const tasks = await Promise.all(sources.map(readTableTaskAsync))

    const expected = {
      name: 'CreateTeamProjectIterations',
      params: { academicyear: '2024/2025', semester: '' },
      rows: [
        { team: 'Команда 1', note: 'a, b' },
        { team: 'Команда 2', note: 'say "hi"' },
        { team: 'Команда 3', note: '' },
        { team: '', note: 'line1\nline2' },
      ],
      rowsByNamespace: { iteration: [{ name: 'Итерация 1' }, { name: 'Итерация 2' }] },
      columns: { team: 3, 'iteration.name': 4, note: 5 },
    }
    for (const task of tasks) {
      expect(task && describeTask(task)).toEqual(expected)
      // Пустая ячейка — отсутствующее значение, где бы она ни стояла в строке.
      expect(task?.getParam('semester').getInt()).toBeNull()
    }
    tasks.forEach((task, i) => expect(task?.source).toBe(sources[i]))
  })

  it('CSV-файл без задания даёт null', async () => {
    const source = new CsvFileTableSource(writeTempCsv('$Name\nИванов\n'))

    expect(await readTableTaskAsync(source)).toBeNull()
  })
})

function describeTask({ name, params, rows, rowsByNamespace, columns }: TableTask) {
  return { name, params, rows, rowsByNamespace, columns }
}

// Ведёт себя как Google Sheets API: весь лист по имени, хвостовые пустые ячейки и строки обрезаны.
function fakeGoogleApi(spreadsheetId: string, sheetName: string, sheetGrid: string[][]): GoogleApi {
  const values = trimTrailingEmpty(
    sheetGrid.map((row) => trimTrailingEmpty(row, (v) => v === '')),
    (r) => r.length === 0,
  )
  return {
    openSpreadsheet(id: string): Spreadsheet {
      if (id !== spreadsheetId) throw new Error(`Unknown spreadsheet ${id}`)
      return {
        getMetaAsync: () => Promise.reject(new Error('not supported')),
        readAsync: async (range: string) => {
          if (range !== `'${sheetName}'`) throw new Error(`Unexpected range ${range}`)
          return { range, values }
        },
        writeAsync: () => Promise.reject(new Error('not supported')),
        appendAsync: () => Promise.reject(new Error('not supported')),
      }
    },
  }
}

function trimTrailingEmpty<T>(items: T[], isEmpty: (item: T) => boolean): T[] {
  let end = items.length
  while (end > 0 && isEmpty(items[end - 1])) end--
  return items.slice(0, end)
}
