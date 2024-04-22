import { BrsApi } from '../apis/BrsApi.js'
import { TableTask, TableTaskWriter } from './TableTask.js'
import { compareNormalized } from '../helpers/tools.js'

export class ExportTechnologyCardsTaskExecutor {
  brsApi: BrsApi
  tableTaskWriter: TableTaskWriter

  constructor(brsApi: BrsApi, tableTaskWriter: TableTaskWriter) {
    this.brsApi = brsApi
    this.tableTaskWriter = tableTaskWriter
  }

  async executeAsync(tableTask: TableTask) {
    console.log(`🚩 Executing task "${tableTask.name}"`)

    const task = extractTask(tableTask)
    if (!task) {
      console.log(`❌ Execution has been stopped`)
      console.log()
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

    console.log(`✅ Execution has been completed`)
    console.log()
  }
}

function extractTask(tableTask: TableTask): ExportTechnologyCardsTask | null {
  const academicYear = tableTask.getParam('academicYear').getCustom((it) => parseInt(it.split('/')[0], 10))
  if (academicYear === null) {
    console.log('- academicYear is required❗')
    return null
  }
  console.log(`- academicYear: ${academicYear}`)

  const semester = tableTask
    .getParam('semester')
    .getCustom((it) => (compareNormalized(it, 'fall') ? 1 : compareNormalized(it, 'spring') ? 2 : null))
  if (semester === null) {
    console.log('- semester is required❗')
    return null
  }
  console.log(`- semester: ${semester}`)

  const studyYears = tableTask.getParam('studyYears').getIntArray()
  if (studyYears === null) {
    console.log('- studyYears is required❗')
    return null
  }
  console.log(`- studyYears: ${studyYears.join(', ')}`)

  const isModule = tableTask.getParam('ismodule').getBool() || false
  console.log(`- isModule: ${isModule}`)

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
