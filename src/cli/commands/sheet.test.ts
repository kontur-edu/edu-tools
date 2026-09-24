import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { GoogleSheetTableSource } from '../../tasks/TableSource'
import { fakeGoogleApi, FakeSheetWrite } from '../../testing/fakeGoogleApi'
import { runCliAsync } from '../../testing/runCli'

// Команды sheet export / sheet import через публичный вход CLI; Google — фейковый (fakeGoogleApi).

const url = 'https://docs.google.com/spreadsheets/d/s-1/edit#gid=7'
const sheetGrid = [
  ['$keys', '$values', '$Note'],
  ['task', 'X', '1, 2'],
  ['academicYear', '2024/2025', 'say "hi"'],
  ['', '', 'line1\nline2'],
]
const sheetCsv = '$keys,$values,$Note\ntask,X,"1, 2"\nacademicYear,2024/2025,"say ""hi"""\n,,"line1\nline2"\n'

function googleApi(grid: string[][], writes: FakeSheetWrite[] = []) {
  return fakeGoogleApi('s-1', 'Лист', grid, writes, 7)
}

describe('sheet export / sheet import', () => {
  const tempDirs: string[] = []
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
  })

  function tempPath(name: string) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edu-tools-sheet-'))
    tempDirs.push(dir)
    return path.join(dir, name)
  }

  function writeTempFile(name: string, text: string) {
    const filePath = tempPath(name)
    fs.writeFileSync(filePath, text, 'utf8')
    return filePath
  }

  it('export: отображаемые значения листа в CSV-файл, результат с размером', async () => {
    const file = tempPath('a.csv')

    const { json, exitCode } = await runCliAsync(['sheet', 'export', url, file, '--json'], googleApi(sheetGrid))

    expect(exitCode).toBe(0)
    expect(json).toMatchObject({ command: 'sheet export', ok: true })
    expect(json.result).toEqual({ sheet: url, file, rows: 4, columns: 3 })
    expect(fs.readFileSync(file, 'utf8')).toBe(sheetCsv)
  })

  it('import в пустой лист: значения записаны как есть, экспорт обратно совпадает побайтно', async () => {
    const a = writeTempFile('a.csv', sheetCsv)
    const b = tempPath('b.csv')
    const api = googleApi([])

    const imported = await runCliAsync(['sheet', 'import', a, url, '--json'], api)
    await runCliAsync(['sheet', 'export', url, b, '--json'], api)

    expect(imported.exitCode).toBe(0)
    expect(imported.json).toMatchObject({ command: 'sheet import', ok: true })
    expect(imported.json.result).toEqual({ file: a, sheet: url, overwrite: false, rows: 4, columns: 3 })
    expect(fs.readFileSync(b, 'utf8')).toBe(sheetCsv)
  })

  it('import в непустой лист без --overwrite: SHEET_NOT_EMPTY, код выхода 1, лист не изменён', async () => {
    const a = writeTempFile('a.csv', sheetCsv)
    const writes: FakeSheetWrite[] = []
    const api = googleApi([['old']], writes)

    const { json, exitCode } = await runCliAsync(['sheet', 'import', a, url, '--json'], api)

    expect(exitCode).toBe(1)
    expect(json.error).toMatchObject({ code: 'SHEET_NOT_EMPTY', details: { sheet: url, option: '--overwrite' } })
    expect(writes).toEqual([])
  })

  it('import --overwrite: лист заменён новой сеткой, лишние старые ячейки очищены', async () => {
    const a = writeTempFile('a.csv', 'a,b\nc\n')
    const api = googleApi([
      ['x', 'x', 'x'],
      ['x', 'x', 'x'],
      ['x', 'x', 'x'],
    ])

    const { json, exitCode } = await runCliAsync(['sheet', 'import', a, url, '--overwrite', '--json'], api)

    expect(exitCode).toBe(0)
    expect(json.result).toMatchObject({ overwrite: true, rows: 2, columns: 2 })
    expect(await new GoogleSheetTableSource(api, 's-1', 'Лист').readGridAsync()).toEqual([['a', 'b'], ['c']])
  })

  it('human: итог одной строкой', async () => {
    const file = tempPath('a.csv')

    const { stdout, exitCode } = await runCliAsync(['sheet', 'export', url, file], googleApi(sheetGrid))

    expect(exitCode).toBe(0)
    expect(stdout).toBe(`Лист выгружен в ${file}: строк 4, колонок 3.\n`)
  })

  it('URL без листа (gid): TASK_SOURCE_INVALID до обращения к Google', async () => {
    const badUrl = 'https://docs.google.com/spreadsheets/d/s-1/edit'

    const exported = await runCliAsync(['sheet', 'export', badUrl, tempPath('a.csv'), '--json'])
    const imported = await runCliAsync(['sheet', 'import', writeTempFile('a.csv', 'a\n'), badUrl, '--json'])

    for (const { json, exitCode } of [exported, imported]) {
      expect(exitCode).toBe(1)
      expect(json.error).toMatchObject({ code: 'TASK_SOURCE_INVALID', details: { source: badUrl, reason: 'bad-url' } })
    }
  })

  it('в таблице нет листа с таким gid: TASK_SOURCE_INVALID', async () => {
    const otherSheet = 'https://docs.google.com/spreadsheets/d/s-1/edit#gid=8'

    const { json } = await runCliAsync(['sheet', 'export', otherSheet, tempPath('a.csv'), '--json'], googleApi([]))

    expect(json.error).toMatchObject({ code: 'TASK_SOURCE_INVALID', details: { reason: 'sheet-not-found' } })
  })

  it('import: нет CSV-файла — TASK_SOURCE_INVALID до обращения к Google', async () => {
    const missing = path.join(os.tmpdir(), 'no-such-sheet.csv')

    const { json, exitCode } = await runCliAsync(['sheet', 'import', missing, url, '--json'])

    expect(exitCode).toBe(1)
    expect(json.error).toMatchObject({ code: 'TASK_SOURCE_INVALID', details: { source: missing, reason: 'not-found' } })
  })

  it('не хватает аргумента: USAGE_ERROR, код выхода 2', async () => {
    const { json, exitCode } = await runCliAsync(['sheet', 'export', url, '--json'])

    expect(exitCode).toBe(2)
    expect(json.error).toMatchObject({ code: 'USAGE_ERROR' })
  })
})
