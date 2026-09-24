import { describe, expect, it } from 'vitest'
import { formatCsv, parseCsv } from '../helpers/csv'
import { fakeGoogleApi, FakeSheetWrite } from '../testing/fakeGoogleApi'
import { convertTableAsync, TableNotEmptyError } from './TableConverter'
import { GoogleSheetTableSource, InMemoryTableSource } from './TableSource'

// Converter (Table sources, «Конвертация»): сетка из одного источника записывается в другой.

const sheetGrid = [
  ['$keys', '$values', '$Note'],
  ['task', 'CreateTeamProjectIterations', '1, 2'],
  ['academicYear', '2024/2025', 'say "hi"'],
  ['', '', 'line1\nline2'],
]

function googleSheet(grid: string[][], writes: FakeSheetWrite[] = []) {
  return new GoogleSheetTableSource(fakeGoogleApi('s-1', 'Лист', grid, writes), 's-1', 'Лист')
}

describe('convertTableAsync', () => {
  it('Google → CSV → Google → CSV: значения и CSV-текст совпадают', async () => {
    const csvA = new InMemoryTableSource([])
    await convertTableAsync(googleSheet(sheetGrid), csvA, { overwrite: false })
    const emptySheet = googleSheet([])
    await convertTableAsync(csvA, emptySheet, { overwrite: false })
    const csvB = new InMemoryTableSource([])
    await convertTableAsync(emptySheet, csvB, { overwrite: false })

    expect(csvA.grid).toEqual(sheetGrid)
    expect(formatCsv(csvB.grid)).toBe(formatCsv(csvA.grid))
  })

  it('CSV → Google → CSV: значения ячеек сохраняются, строки выравниваются до одной ширины', async () => {
    const csvText = '$keys,$values,$A\ntask,X,"1, 2"\n,\n2024/2025\n'
    const sheet = googleSheet([])
    await convertTableAsync(new InMemoryTableSource(parseCsv(csvText)), sheet, { overwrite: false })
    const back = new InMemoryTableSource([])
    await convertTableAsync(sheet, back, { overwrite: false })

    expect(back.grid).toEqual([
      ['$keys', '$values', '$A'],
      ['task', 'X', '1, 2'],
      ['', '', ''],
      ['2024/2025', '', ''],
    ])
  })

  it('пишет значения строками одним блоком с A1', async () => {
    const writes: FakeSheetWrite[] = []

    const size = await convertTableAsync(new InMemoryTableSource(sheetGrid), googleSheet([], writes), {
      overwrite: false,
    })

    expect(writes).toEqual([{ range: "'Лист'!A1:C", values: sheetGrid }])
    expect(size).toEqual({ rows: 4, columns: 3 })
  })

  it('непустой целевой лист без overwrite: ошибка, в лист ничего не пишется', async () => {
    const writes: FakeSheetWrite[] = []
    const target = googleSheet(
      [
        ['', ''],
        ['', 'old'],
      ],
      writes,
    )

    await expect(
      convertTableAsync(new InMemoryTableSource(sheetGrid), target, { overwrite: false }),
    ).rejects.toBeInstanceOf(TableNotEmptyError)

    expect(writes).toEqual([])
    expect(await target.readGridAsync()).toEqual([[], ['', 'old']])
  })

  it('лист только с пустыми ячейками считается пустым', async () => {
    const target = new InMemoryTableSource([['', ''], ['']])

    await convertTableAsync(new InMemoryTableSource([['a']]), target, { overwrite: false })

    expect(target.grid).toEqual([
      ['a', ''],
      ['', ''],
    ])
  })

  it('overwrite: лишние старые ячейки за пределами новой сетки очищаются', async () => {
    const target = googleSheet([['x', 'x', 'x', 'x'], ['x', 'x', 'x', 'x'], ['x', 'x', 'x', 'x'], ['x']])

    await convertTableAsync(new InMemoryTableSource([['a', 'b'], ['c']]), target, { overwrite: true })

    expect(await target.readGridAsync()).toEqual([['a', 'b'], ['c']])
  })

  it('пустой источник в пустой лист: ничего не пишется', async () => {
    const writes: FakeSheetWrite[] = []

    const size = await convertTableAsync(new InMemoryTableSource([]), googleSheet([], writes), { overwrite: false })

    expect(writes).toEqual([])
    expect(size).toEqual({ rows: 0, columns: 0 })
  })
})
