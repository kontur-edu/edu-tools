import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { BrsApi, TechnologyCard, TermType } from '../apis/BrsApi'
import { BrsAuth } from '../apis/BrsAuth'
import { BrsUrlProvider } from '../apis/BrsUrlProvider'
import { CsvFileTableSource, readCsvFile, writeCsvFile } from '../apis/NodeCsvFile'
import { formatCsv } from '../helpers/csv'
import { ExportTechnologyCardsTaskExecutor } from './ExportTechnologyCardsTask'
import { readTableTaskAsync, TableTaskWriter } from './TableTask'
import { TableSource, WriteSkippingTableSource } from './TableSource'
import { TaskEventCollector } from './TaskEvents'
import { TaskReporter } from './TaskReporter'

// ExportTechnologyCards из CSV (FT-0018): запись на лист идёт в выходной файл или превращается в warning.

const taskGrid = [
  ['$keys', '$values', '', '$output'],
  ['task', 'ExportTechnologyCards', '', ''],
  ['academicYear', '2024/2025', '', ''],
  ['semester', 'fall', '', ''],
  ['studyYears', '1', '', ''],
]

const cards: TechnologyCard[] = [
  { disciplineLoad: 'load-1', discipline: 'Алгебра', group: 'МЕН-1, МЕН-2', isModule: false, agreed: true },
  { disciplineLoad: 'load-2', discipline: 'Геометрия', group: 'МЕН-3', isModule: false, agreed: false },
]

describe('ExportTechnologyCards с CSV-источником', () => {
  const tempDirs: string[] = []
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
  })

  function writeTaskCsv() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edu-tools-export-'))
    tempDirs.push(dir)
    const filePath = path.join(dir, 'export.csv')
    fs.writeFileSync(filePath, formatCsv(taskGrid) + '\n', 'utf8')
    return filePath
  }

  it('save: выходной файл = входная сетка + таблица техкарт с колонки $output; входной файл не меняется', async () => {
    const filePath = writeTaskCsv()
    const inputText = fs.readFileSync(filePath, 'utf8')
    const outPath = path.join(path.dirname(filePath), 'result.csv')
    const source = new CsvFileTableSource(filePath)

    await runExportAsync(source, new TaskEventCollector())
    writeCsvFile(outPath, await source.readGridAsync())

    expect(fs.readFileSync(filePath, 'utf8')).toBe(inputText)
    const header = ['disciplineLoad', 'discipline', 'group', 'isModule', 'academicYear', 'studyYear', 'semester']
    expect(readCsvFile(outPath)).toEqual([
      ['$keys', '$values', '', '$output', ...header, 'agreed'],
      [
        'task',
        'ExportTechnologyCards',
        '',
        '1',
        'load-1',
        'Алгебра',
        'МЕН-1, МЕН-2',
        'FALSE',
        '2024',
        '1',
        '1',
        'TRUE',
      ],
      ['academicYear', '2024/2025', '', '2', 'load-2', 'Геометрия', 'МЕН-3', 'FALSE', '2024', '1', '1', 'FALSE'],
      ['semester', 'fall', '', '', '', '', '', '', '', '', '', ''],
      ['studyYears', '1', '', '', '', '', '', '', '', '', '', ''],
    ])
  })

  it('save без --out: запись не выполняется, событие warning с таблицей техкарт в details', async () => {
    const filePath = writeTaskCsv()
    const inputText = fs.readFileSync(filePath, 'utf8')
    const collector = new TaskEventCollector()
    const reporter = new TaskReporter(collector.listener)

    await runExportAsync(new WriteSkippingTableSource(new CsvFileTableSource(filePath), reporter), collector)

    expect(fs.readFileSync(filePath, 'utf8')).toBe(inputText)
    const warnings = collector.events.filter((e) => e.kind === 'outcome' && e.status === 'warning')
    expect(warnings).toEqual([
      expect.objectContaining({
        scope: 'D1:L3',
        details: {
          range: 'D1:L3',
          values:
            '$output,disciplineLoad,discipline,group,isModule,academicYear,studyYear,semester,agreed\n' +
            '1,load-1,Алгебра,"МЕН-1, МЕН-2",FALSE,2024,1,1,TRUE\n' +
            '2,load-2,Геометрия,МЕН-3,FALSE,2024,1,1,FALSE',
        },
      }),
    ])
    expect(collector.getSummary().ok).toBe(true)
  })
})

async function runExportAsync(source: TableSource, collector: TaskEventCollector) {
  const task = await readTableTaskAsync(source)
  if (!task) throw new Error('Задание не прочитано')
  const executor = new ExportTechnologyCardsTaskExecutor(
    new FakeBrsApi(),
    new TableTaskWriter(),
    new TaskReporter(collector.listener),
  )
  await executor.executeAsync(task, true)
}

// БРС без сети: техкарты курса 1 осеннего семестра.
class FakeBrsApi extends BrsApi {
  constructor() {
    super(new BrsAuth('fake-sid'), new BrsUrlProvider(false))
  }

  async getTechnologyCardsAsync(year: number, termType: TermType, course: number): Promise<TechnologyCard[]> {
    return year === 2024 && termType === TermType.Fall && course === 1 ? cards : []
  }
}
