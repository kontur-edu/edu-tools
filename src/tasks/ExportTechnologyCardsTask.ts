import { BrsApi } from '../apis/BrsApi'
import { TableTask, TableTaskWriter } from './TableTask'
import { compareNormalized } from '../helpers/tools'
import { ConsoleTableTaskLogger, TableTaskLogger } from './TableTaskLogger'

export class ExportTechnologyCardsTaskExecutor {
  brsApi: BrsApi
  tableTaskWriter: TableTaskWriter
  tableTaskLogger: TableTaskLogger

  constructor(brsApi: BrsApi, tableTaskWriter: TableTaskWriter, tableTaskLogger?: TableTaskLogger) {
    this.brsApi = brsApi
    this.tableTaskWriter = tableTaskWriter
    this.tableTaskLogger = tableTaskLogger || new ConsoleTableTaskLogger()
  }

  async executeAsync(tableTask: TableTask) {
    this.tableTaskLogger.log(`🚩 Executing task "${tableTask.name}"`)

    const task = extractTask(tableTask, this.tableTaskLogger)
    if (!task) {
      this.tableTaskLogger.log(`❌ Execution has been stopped`)
      this.tableTaskLogger.log()
      return
    }

    const values: Array<Array<any>> = [
      [
        '$output',
        'disciplineLoad',
        'discipline',
        'group',
        'isModule',
        'academicYear',
        'studyYear',
        'semester',
        'agreed',
      ],
    ]

    let order = 1
    for (const studyYear of task.studyYears) {
      const technologyCards = await this.brsApi.getTechnologyCardsAsync(
        task.academicYear,
        task.semester,
        studyYear,
        task.isModule,
      )

      for (const card of technologyCards) {
        values.push([
          order++,
          card.disciplineLoad,
          card.discipline,
          card.group,
          card.isModule,
          task.academicYear,
          studyYear,
          task.semester,
          card.agreed,
        ])
      }
    }

    await this.tableTaskWriter.batchWriteAsync(task.outputColumn, 0, values)

    this.tableTaskLogger.log(`✅ Execution has been completed`)
    this.tableTaskLogger.log()
  }
}

function extractTask(tableTask: TableTask, tableTaskLogger: TableTaskLogger): ExportTechnologyCardsTask | null {
  const academicYear = tableTask.getParam('academicYear').getCustom((it) => parseInt(it.split('/')[0], 10))
  if (academicYear === null) {
    tableTaskLogger.log('- academicYear is required❗')
    return null
  }
  tableTaskLogger.log(`- academicYear: ${academicYear}`)

  const semester = tableTask
    .getParam('semester')
    .getCustom((it) => (compareNormalized(it, 'fall') ? 1 : compareNormalized(it, 'spring') ? 2 : null))
  if (semester === null) {
    tableTaskLogger.log('- semester is required❗')
    return null
  }
  tableTaskLogger.log(`- semester: ${semester}`)

  const studyYears = tableTask.getParam('studyYears').getIntArray()
  if (studyYears === null) {
    tableTaskLogger.log('- studyYears is required❗')
    return null
  }
  tableTaskLogger.log(`- studyYears: ${studyYears.join(', ')}`)

  const isModule = tableTask.getParam('ismodule').getBool() || false
  tableTaskLogger.log(`- isModule: ${isModule}`)

  return {
    name: tableTask.name,
    academicYear,
    semester,
    studyYears,
    isModule,
    outputColumn: tableTask.columns['output'],
  }
}

interface ExportTechnologyCardsTask {
  name: string
  academicYear: number
  semester: number
  studyYears: Array<number>
  isModule: boolean
  outputColumn: number
}
