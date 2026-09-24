import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { CsvFileTableSource, readCsvFile, writeCsvFile } from '../apis/NodeCsvFile'
import { formatCsv } from '../helpers/csv'
import { fakeGoogleApi, FakeSheetWrite } from '../testing/fakeGoogleApi'
import { readTableTaskAsync, TableTask, TableTaskWriter } from './TableTask'
import { GoogleSheetTableSource, InMemoryTableSource, writeBlockToGrid, WriteSkippingTableSource } from './TableSource'
import { TaskEventCollector } from './TaskEvents'
import { TaskReporter } from './TaskReporter'

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

  it('CSV-файл: запись идёт в сетку в памяти, входной файл не меняется; сетка сохраняется в выходной файл', async () => {
    const text = '$keys,$values,$output\ntask,ExportTechnologyCards,\n'
    const filePath = writeTempCsv(text)
    const outPath = path.join(path.dirname(filePath), 'out.csv')
    const source = new CsvFileTableSource(filePath)

    await source.writeBlockAsync(2, 0, [
      ['$output', 'discipline, name'],
      [1, 'Алгебра "1"'],
      [2, 'line1\nline2'],
    ])
    writeCsvFile(outPath, await source.readGridAsync())

    expect(fs.readFileSync(filePath, 'utf8')).toBe(text)
    const expected = [
      ['$keys', '$values', '$output', 'discipline, name'],
      ['task', 'ExportTechnologyCards', '1', 'Алгебра "1"'],
      ['', '', '2', 'line1\nline2'],
    ]
    expect(await source.readGridAsync()).toEqual(expected)
    expect(readCsvFile(outPath)).toEqual(expected)
    expect(fs.readFileSync(outPath, 'utf8')).toBe(formatCsv(expected) + '\n')
  })
})

describe('InMemoryTableSource: запись на лист', () => {
  it('пишет блок в свою сетку, чтение возвращает сетку после записи', async () => {
    const source = new InMemoryTableSource([['$keys', '$values']])

    await source.writeBlockAsync(0, 1, [['task', 'X']])

    expect(await source.readGridAsync()).toEqual([
      ['$keys', '$values'],
      ['task', 'X'],
    ])
  })
})

describe('writeBlockToGrid: запись блока в сетку в памяти', () => {
  it('расширяет сетку до блока и выравнивает строки до одной ширины', () => {
    const input = [
      ['$keys', '$values'],
      ['task', 'ExportTechnologyCards', '$output'],
    ]

    const result = writeBlockToGrid(input, 3, 1, [
      ['a', 'b'],
      ['c', 'd'],
    ])

    expect(result).toEqual([
      ['$keys', '$values', '', '', ''],
      ['task', 'ExportTechnologyCards', '$output', 'a', 'b'],
      ['', '', '', 'c', 'd'],
    ])
  })

  it('пишет значения как их покажет Google: числа строкой, bool — TRUE/FALSE, null не меняет ячейку', () => {
    const input = [['x', 'y', 'z', 'w']]

    const result = writeBlockToGrid(input, 0, 0, [[1, true, null, undefined, false, '']])

    expect(result).toEqual([['1', 'TRUE', 'z', 'w', 'FALSE', '']])
  })

  it('не меняет входную сетку', () => {
    const input = [['a'], ['b']]

    writeBlockToGrid(input, 0, 0, [['x', 'y']])

    expect(input).toEqual([['a'], ['b']])
  })

  it('пустой блок: сетка без изменений значений', () => {
    expect(writeBlockToGrid([['a', 'b'], ['c']], 5, 5, [])).toEqual([
      ['a', 'b'],
      ['c', ''],
    ])
  })
})

describe('WriteSkippingTableSource: запись на лист не выполняется', () => {
  it('читает сетку источника, а вместо записи выдаёт warning с диапазоном и значениями блока в CSV', async () => {
    const grid = [['$keys', '$values']]
    const collector = new TaskEventCollector()
    const source = new WriteSkippingTableSource(new InMemoryTableSource(grid), new TaskReporter(collector.listener))

    await source.writeBlockAsync(7, 0, [
      ['$output', 'discipline'],
      [1, 'Алгебра, 1'],
      [2, null],
    ])

    expect(await source.readGridAsync()).toEqual([['$keys', '$values']])
    expect(collector.events).toEqual([
      {
        kind: 'outcome',
        status: 'warning',
        scope: 'H1:I3',
        message: 'Запись на лист (H1:I3) не выполнена: укажите --out <file.csv>, чтобы сохранить результат.',
        details: { range: 'H1:I3', values: '$output,discipline\n1,"Алгебра, 1"\n2,' },
      },
    ])
  })

  it('пустой блок: событий нет', async () => {
    const collector = new TaskEventCollector()
    const source = new WriteSkippingTableSource(new InMemoryTableSource([]), new TaskReporter(collector.listener))

    await source.writeBlockAsync(0, 0, [])

    expect(collector.events).toEqual([])
  })
})

describe('GoogleSheetTableSource: запись на лист', () => {
  function sourceWithWrites(sheetName: string) {
    const writes: FakeSheetWrite[] = []
    const source = new GoogleSheetTableSource(fakeGoogleApi('s-1', sheetName, [], writes), 's-1', sheetName)
    return { source, writes }
  }

  it('TableTaskWriter пишет блок в тот же лист, из которого прочитано задание (как ExportTechnologyCards)', async () => {
    const writes: FakeSheetWrite[] = []
    const sheetGrid = [
      ['$keys', '$values'],
      ['task', 'ExportTechnologyCards'],
      ['outputColumn', 'H'],
    ]
    const task = await readTableTaskAsync(
      new GoogleSheetTableSource(fakeGoogleApi('s-1', 'Курсы по выбору', sheetGrid, writes), 's-1', 'Курсы по выбору'),
    )

    if (!task) throw new Error('Задание не прочитано')
    await new TableTaskWriter().batchWriteAsync(task, 7, 0, [
      ['Дисциплина', 'Итого'],
      ['Алгебра', 100],
    ])

    expect(writes).toEqual([
      {
        range: "'Курсы по выбору'!H1:I",
        values: [
          ['Дисциплина', 'Итого'],
          ['Алгебра', 100],
        ],
      },
    ])
  })

  it('пишет пакетами по 50 строк, каждый пакет — со своей строки', async () => {
    const { source, writes } = sourceWithWrites('Лист')
    const values = Array.from({ length: 120 }, (_, i) => [`r${i}`, i, ''])

    await source.writeBlockAsync(0, 2, values)

    expect(writes.map((w) => [w.range, w.values.length])).toEqual([
      ["'Лист'!A3:C", 50],
      ["'Лист'!A53:C", 50],
      ["'Лист'!A103:C", 20],
    ])
    expect(writes.flatMap((w) => w.values)).toEqual(values)
  })

  it('называет колонки после Z двумя буквами', async () => {
    const { source, writes } = sourceWithWrites('Лист')

    await source.writeBlockAsync(25, 0, [['a', 'b', 'c']])
    await source.writeBlockAsync(51, 9, [['a', 'b']])

    expect(writes.map((w) => w.range)).toEqual(["'Лист'!Z1:AB", "'Лист'!AZ10:BA"])
  })

  it('называет колонки после ZZ тремя буквами', async () => {
    const { source, writes } = sourceWithWrites('Лист')

    await source.writeBlockAsync(701, 0, [['a', 'b']])
    await source.writeBlockAsync(18277, 0, [['a']])

    expect(writes.map((w) => w.range)).toEqual(["'Лист'!ZZ1:AAA", "'Лист'!ZZZ1:ZZZ"])
  })

  it('экранирует апостроф в имени листа', async () => {
    const { source, writes } = sourceWithWrites("Курсы 'по выбору'")

    await source.writeBlockAsync(0, 0, [['x']])

    expect(writes.map((w) => w.range)).toEqual(["'Курсы ''по выбору'''!A1:A"])
  })

  it('пустой блок ничего не пишет', async () => {
    const { source, writes } = sourceWithWrites('Лист')

    await source.writeBlockAsync(3, 0, [])

    expect(writes).toEqual([])
  })
})

function describeTask({ name, params, rows, rowsByNamespace, columns }: TableTask) {
  return { name, params, rows, rowsByNamespace, columns }
}
