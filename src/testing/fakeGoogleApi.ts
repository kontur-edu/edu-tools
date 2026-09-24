import { GoogleApi, Spreadsheet } from '../apis/GoogleApi'
import { writeBlockToGrid } from '../tasks/TableSource'

// Только для тестов (в сборку не входит, см. tsconfig.json).

export interface FakeSheetWrite {
  range: string
  values: unknown[][]
}

/**
 * Таблица с одним листом, которая ведёт себя как Google Sheets API: весь лист читается по имени,
 * хвостовые пустые ячейки и строки обрезаны; запись (`RAW`) меняет лист, как `writeBlockToGrid`.
 * Каждая запись складывается в `writes`.
 */
export function fakeGoogleApi(
  spreadsheetId: string,
  sheetName: string,
  sheetGrid: string[][],
  writes: FakeSheetWrite[] = [],
  sheetId = 0,
): GoogleApi {
  const quotedName = `'${sheetName.replace(/'/g, "''")}'`
  let grid = sheetGrid
  return {
    openSpreadsheet(id: string): Spreadsheet {
      if (id !== spreadsheetId) throw new Error(`Unknown spreadsheet ${id}`)
      return {
        getMetaAsync: async () => ({
          spreadsheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          properties: { title: 'Таблица' },
          sheets: [{ properties: { hidden: false, index: 0, sheetId, sheetType: 'GRID', title: sheetName } }],
        }),
        readAsync: async (range: string) => {
          if (range !== quotedName) throw new Error(`Unexpected range ${range}`)
          return { range, values: trimmedValues(grid) }
        },
        writeAsync: async (range: string, values: unknown[][]) => {
          const match = range.startsWith(quotedName + '!')
            ? /^([A-Z]+)(\d+):[A-Z]+$/.exec(range.slice(quotedName.length + 1))
            : null
          if (!match) throw new Error(`Unexpected range ${range}`)
          writes.push({ range, values })
          grid = writeBlockToGrid(grid, letter2index(match[1]), Number(match[2]) - 1, values)
        },
        appendAsync: () => Promise.reject(new Error('not supported')),
      }
    },
  }
}

function trimmedValues(grid: string[][]): string[][] {
  return trimTrailingEmpty(
    grid.map((row) => trimTrailingEmpty(row, (v) => v === '')),
    (r) => r.length === 0,
  )
}

function trimTrailingEmpty<T>(items: T[], isEmpty: (item: T) => boolean): T[] {
  let end = items.length
  while (end > 0 && isEmpty(items[end - 1])) end--
  return items.slice(0, end)
}

// Буквы колонки A1-нотации → индекс с 0: A → 0, AA → 26.
function letter2index(letters: string): number {
  return [...letters].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 'A'.charCodeAt(0) + 1), 0) - 1
}
