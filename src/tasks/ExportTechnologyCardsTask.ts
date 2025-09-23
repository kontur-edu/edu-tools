import { BrsApi } from '../apis/BrsApi'
import { TableTask, TableTaskWriter } from './TableTask'
import { compareNormalized } from '../helpers/tools'
import { ConsoleTableTaskLogger, TableTaskLogger } from './TableTaskLogger'

export class ExportTechnologyCardsTaskExecutor {
  static readonly TASK_NAME = 'ExportTechnologyCards'
  
  brsApi: BrsApi
  tableTaskWriter: TableTaskWriter
  tableTaskLogger: TableTaskLogger

  constructor(brsApi: BrsApi, tableTaskWriter: TableTaskWriter, tableTaskLogger: TableTaskLogger | null) {
    this.brsApi = brsApi
    this.tableTaskWriter = tableTaskWriter
    this.tableTaskLogger = tableTaskLogger || new ConsoleTableTaskLogger()
  }

  async executeAsync(tableTask: TableTask, forceSave: boolean | null = null) {
    this.tableTaskLogger.log(`🚩 Executing task "${tableTask.name}"`)

    const task = extractTask(tableTask, this.tableTaskLogger, forceSave)
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

    if (task.save) {
      const outputSpreadsheetId = tableTask.spreadsheetId
      const outputSheetName = tableTask.sheetName
      await this.tableTaskWriter.batchWriteAsync(outputSpreadsheetId, outputSheetName, task.outputColumn, 0, values)
    }

    this.tableTaskLogger.log(`✅ Execution has been completed`)
    this.tableTaskLogger.log()
  }
}

function extractTask(tableTask: TableTask, tableTaskLogger: TableTaskLogger, forceSave: boolean | null = null): ExportTechnologyCardsTask | null {
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

  let save = tableTask.getParam('save').getBool() || false
  if (forceSave !== null) {
    save = forceSave
  }
  tableTaskLogger.log(save ? `- save mode on ⚡` : `- save mode off`)

  return {
    name: tableTask.name,
    save,
    academicYear,
    semester,
    studyYears,
    isModule,
    outputColumn: tableTask.columns['output'],
  }
}

interface ExportTechnologyCardsTask {
  name: string
  save: boolean
  academicYear: number
  semester: number
  studyYears: Array<number>
  isModule: boolean
  outputColumn: number
}
