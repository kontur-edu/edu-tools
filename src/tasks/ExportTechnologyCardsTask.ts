import { BrsApi } from '../apis/BrsApi'
import { TableTask, TableTaskWriter } from './TableTask'
import { compareNormalized } from '../helpers/tools'
import { TaskReporter } from './TaskReporter'

export class ExportTechnologyCardsTaskExecutor {
  static readonly TASK_NAME = 'ExportTechnologyCards'

  brsApi: BrsApi
  tableTaskWriter: TableTaskWriter
  reporter: TaskReporter

  constructor(brsApi: BrsApi, tableTaskWriter: TableTaskWriter, reporter: TaskReporter | null) {
    this.brsApi = brsApi
    this.tableTaskWriter = tableTaskWriter
    this.reporter = reporter || TaskReporter.console()
  }

  async executeAsync(tableTask: TableTask, forceSave: boolean | null = null) {
    this.reporter.started(tableTask.name, `Executing task "${tableTask.name}"`)

    const task = extractTask(tableTask, this.reporter, forceSave)
    if (!task) {
      this.reporter.error(tableTask.name, 'Execution has been stopped', { stopped: true })
      this.reporter.separator()
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
      await this.tableTaskWriter.batchWriteAsync(tableTask, task.outputColumn, 0, values)
    }

    this.reporter.finished(tableTask.name, 'Execution has been completed')
    this.reporter.separator()
  }
}

function extractTask(
  tableTask: TableTask,
  reporter: TaskReporter,
  forceSave: boolean | null = null,
): ExportTechnologyCardsTask | null {
  const academicYear = tableTask.getParam('academicYear').getCustom((it) => parseInt(it.split('/')[0], 10))
  if (academicYear === null) {
    reporter.note('academicYear is required', true)
    return null
  }
  reporter.note(`academicYear: ${academicYear}`)

  const semester = tableTask
    .getParam('semester')
    .getCustom((it) => (compareNormalized(it, 'fall') ? 1 : compareNormalized(it, 'spring') ? 2 : null))
  if (semester === null) {
    reporter.note('semester is required', true)
    return null
  }
  reporter.note(`semester: ${semester}`)

  const studyYears = tableTask.getParam('studyYears').getIntArray()
  if (studyYears === null) {
    reporter.note('studyYears is required', true)
    return null
  }
  reporter.note(`studyYears: ${studyYears.join(', ')}`)

  const isModule = tableTask.getParam('ismodule').getBool() || false
  reporter.note(`isModule: ${isModule}`)

  let save = tableTask.getParam('save').getBool() || false
  if (forceSave !== null) {
    save = forceSave
  }
  reporter.note(save ? 'save mode on ⚡' : 'save mode off')

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
