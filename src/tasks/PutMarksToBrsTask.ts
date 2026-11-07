import { BrsApi, StudentFailure, TermType } from '../apis/BrsApi'
import putMarksToBrsAsync, { ControlActionConfig, MarksData } from '../actions/putMarksToBrsAsync'
// Только тип: readStudentsAsync тянет fs (NodeCsvFile), а этот модуль попадает в web-сборку.
import type { ActualStudent } from '../actions/readStudentsAsync'
import { parseStudentFailure } from '../helpers/BrsHelpers'
import { compareNormalized } from '../helpers/tools'
import { TableTask, TableTaskValue } from './TableTask'
import { TableRow } from './tableTaskParser'
import { TaskReporter } from './TaskReporter'

// Перенос баллов в БРС: контрольные мероприятия — в $$-колонках (ADR-0006), логика — putMarksToBrsAsync.
export class PutMarksToBrsTaskExecutor {
  static readonly TASK_NAME = 'PutMarksToBrs'

  brsApi: BrsApi
  reporter: TaskReporter

  constructor(brsApi: BrsApi, reporter: TaskReporter | null) {
    this.brsApi = brsApi
    this.reporter = reporter || TaskReporter.console()
  }

  async executeAsync(tableTask: TableTask, forceSave: boolean | null = null) {
    this.reporter.started(tableTask.name, `Executing task "${tableTask.name}"`)

    const task = buildPutMarksTask(tableTask, this.reporter, forceSave)
    if (!task) {
      this.reporter.error(tableTask.name, 'Execution has been stopped', { stopped: true })
      this.reporter.separator()
      return
    }

    const log = (line: string) => reportLine(this.reporter, line)
    try {
      await putMarksToBrsAsync(this.brsApi, task.marksData, { save: task.save, verbose: true, log })
    } catch (error) {
      this.reporter.error(tableTask.name, `Execution has been failed: ${formatError(error)}`, { stopped: true })
      this.reporter.separator()
      return
    }

    this.reporter.finished(tableTask.name, 'Execution has been completed')
    this.reporter.separator()
  }
}

export interface PutMarksTask {
  save: boolean
  marksData: MarksData
}

// Собирает MarksData из листа; при ошибке параметров пишет note с ❗ и возвращает null.
export function buildPutMarksTask(
  tableTask: TableTask,
  reporter: TaskReporter,
  forceSave: boolean | null,
): PutMarksTask | null {
  const discipline = tableTask.getParam('discipline').getString()
  if (discipline === null) {
    reporter.note('discipline required', true)
    return null
  }
  reporter.note(`discipline: ${discipline}`)

  const academicYear = tableTask.getParam('academicYear').getCustom(parseAcademicYear)
  if (academicYear === null) {
    reporter.note('academicYear required', true)
    return null
  }
  reporter.note(`academicYear: ${academicYear}`)

  const termType = tableTask.getParam('semester').getCustom(parseTermType)
  if (termType === null) {
    reporter.note('semester required', true)
    return null
  }
  reporter.note(`semester: ${termType === TermType.Fall ? 'fall' : 'spring'}`)

  // Не задан — 0, то есть все курсы; задан, но не целое — ошибка, чтобы не перенести баллы всем курсам молча.
  const studyYearValue = tableTask.getParam('studyYear')
  const studyYear = studyYearValue.value ? studyYearValue.getCustom(parseInteger) : 0
  if (studyYear === null) {
    reporter.note('studyYear must be an integer', true)
    return null
  }
  reporter.note(`studyYear: ${studyYear === 0 ? 'all' : studyYear}`)

  const isModule = tableTask.getParam('isModule').getBool() ?? false
  reporter.note(`isModule: ${isModule}`)

  const defaultStudentFailure =
    parseStudentFailure(tableTask.getParam('defaultFailure').value ?? '') ?? StudentFailure.NoFailure

  let save = tableTask.getParam('save').getBool() || false
  if (forceSave !== null) {
    save = forceSave
  }
  reporter.note(save ? 'save mode on ⚡' : 'save mode off')

  const controlActionConfigs = buildControlActionConfigs(tableTask.extraColumns)
  if (controlActionConfigs.length === 0) {
    reporter.note('control action columns ($$) required', true)
    return null
  }
  reporter.note(`control actions: ${tableTask.extraColumns.join(', ')}`)

  const actualStudents = tableTask.rows
    .map((row, index) => convertRow2ActualStudent(row, tableTask.extraValues[index] ?? []))
    .filter((it): it is ActualStudent => it !== null)
  if (actualStudents.length < tableTask.rows.length) {
    reporter.note(`${actualStudents.length} students were found in ${tableTask.rows.length} rows`, true)
  } else {
    reporter.note(`${actualStudents.length} students were found`)
  }

  reporter.separator()

  return {
    save,
    marksData: {
      actualStudents,
      disciplineConfig: {
        name: discipline,
        year: academicYear,
        termType,
        course: studyYear,
        isModule,
        defaultStudentFailure,
        isSuitableDiscipline: null,
      },
      controlActionConfigs,
    },
  }
}

// Одинаковые (нормализованно) названия сопоставляются с мероприятиями БРС по порядку — как в buildAutoMarksConfigAsync.
function buildControlActionConfigs(extraColumns: string[]): ControlActionConfig[] {
  return extraColumns.map((name, propertyIndex) => {
    const sameIndices = extraColumns
      .map((other, index) => (compareNormalized(other, name) ? index : -1))
      .filter((index) => index >= 0)
    if (sameIndices.length < 2) {
      return { controlActions: [name], propertyIndex }
    }
    return {
      controlActions: [name],
      propertyIndex,
      matchIndex: sameIndices.indexOf(propertyIndex),
      matchCount: sameIndices.length,
    }
  })
}

function convertRow2ActualStudent(row: TableRow, properties: string[]): ActualStudent | null {
  const fullName = TableTaskValue.extract(row, 'student').getString()
  const groupName = TableTaskValue.extract(row, 'group').getString()
  if (fullName === null || groupName === null) {
    return null
  }
  const failure = TableTaskValue.extract(row, 'failure').getCustom(parseStudentFailure)
  return { fullName, groupName, id: null, failure, properties }
}

function parseAcademicYear(value: string): number | null {
  return parseInteger(value.split('/')[0])
}

function parseTermType(value: string): TermType | null {
  if (compareNormalized(value, 'fall')) return TermType.Fall
  if (compareNormalized(value, 'spring')) return TermType.Spring
  return null
}

function parseInteger(value: string): number | null {
  return /^\s*-?\d+\s*$/.test(value) ? parseInt(value, 10) : null
}

// Отчёт putMarks* — строки без статуса (FT-0002): пустая → separator, «# …» → heading, остальные → note.
function reportLine(reporter: TaskReporter, line: string) {
  if (line === '') {
    reporter.separator()
  } else if (line.startsWith('# ')) {
    reporter.heading(1, line.substring(2))
  } else {
    reporter.note(line)
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
