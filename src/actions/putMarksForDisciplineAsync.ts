import { BrsApi, ControlAction, Discipline, StudentMark, StudentFailure } from '../apis/BrsApi'
import { parseAnyFloat, compareNormalized } from '../helpers/tools'
import * as fio from '../helpers/fio'
// Только тип: readStudentsAsync тянет fs (NodeCsvFile), а этот модуль попадает в web-сборку.
import type { ActualStudent } from './readStudentsAsync'
import { formatStudentFailure } from '../helpers/BrsHelpers'

export default async function putMarksForDisciplineAsync(
  brsApi: BrsApi,
  discipline: Discipline,
  actualStudents: ActualStudent[],
  defaultStudentFailure: StudentFailure,
  controlActionConfigs: ControlActionConfig[],
  options: PutMarksOptions,
) {
  if (actualStudents.length === 0) return
  const log = resolvePutMarksLog(options)
  log(`# Processing group ${discipline.group}`)
  log('')

  const controlActions = await brsApi.getAllControlActionsAsync(discipline)
  if (!checkControlActionsConfiguration(controlActions, controlActionConfigs, log)) {
    return
  }

  const brsStudents = await brsApi.getAllStudentMarksAsync(discipline)
  const { mergedStudents, skippedActualStudents, skippedBrsStudents } = mergeStudents(actualStudents, brsStudents)
  logMergedStudents(mergedStudents, skippedActualStudents, skippedBrsStudents, log)
  log('')

  await putMarksForStudentsAsync(brsApi, discipline, mergedStudents, controlActionConfigs, controlActions, options)
  log('')

  await updateFailuresForSkippedStudentsAsync(brsApi, skippedBrsStudents, discipline, defaultStudentFailure, options)
  log('')

  if (options.save) {
    await brsApi.updateAllMarksAsync(discipline)
  }

  log('')
}

function checkControlActionsConfiguration(
  controlActions: ControlAction[],
  controlActionConfigs: ControlActionConfig[],
  log: PutMarksLog,
) {
  for (const config of controlActionConfigs) {
    if (!getSuitableControlAction(config, controlActions, log)) {
      return false
    }
  }
  return true
}

async function putMarksForStudentsAsync(
  brsApi: BrsApi,
  discipline: Discipline,
  students: MergedStudent[],
  controlActionConfigs: ControlActionConfig[],
  controlActions: ControlAction[],
  options: PutMarksOptions,
) {
  const log = resolvePutMarksLog(options)
  const statusCounters: { [k: string]: number } = {}

  for (const student of students) {
    const status = await putMarksForStudentAsync(
      brsApi,
      discipline,
      student,
      controlActionConfigs,
      controlActions,
      options,
    )
    if (statusCounters[status] === undefined) {
      statusCounters[status] = 0
    }
    statusCounters[status]++
  }

  log('Marks update statuses:')
  for (const k of Object.keys(statusCounters)) {
    log(`- ${k} = ${statusCounters[k]}`)
  }
}

async function putMarksForStudentAsync(
  brsApi: BrsApi,
  discipline: Discipline,
  student: MergedStudent,
  controlActionConfigs: ControlActionConfig[],
  controlActions: ControlAction[],
  options: PutMarksOptions,
) {
  const log = resolvePutMarksLog(options)
  let updated = 0
  let failed = 0

  const marks = []
  for (const config of controlActionConfigs) {
    const controlAction = getSuitableControlAction(config, controlActions, log)
    if (!controlAction) {
      throw new Error()
    }

    const brsMark = parseAnyFloat(student.brs[controlAction.uuid] as string)
    const actualMark = parseAnyFloat(student.actual.properties[config.propertyIndex])

    if (actualMark === brsMark || actualMark === 0) {
      marks.push(`    ${actualMark} `.substr(`${actualMark}`.length - 1))
      continue
    } else {
      marks.push(`    ${actualMark}!`.substr(`${actualMark}`.length - 1))
    }

    try {
      if (options.save) {
        await brsApi.putStudentMarkAsync(
          student.brs.studentUuid,
          controlAction.uuidWithoutPrefix,
          actualMark,
          discipline.groupHistoryId,
          student.brs.cardType,
          student.brs.disciplineLoad,
        )
      }
      updated++
    } catch (error) {
      failed++
    }
  }

  const brsFailureStatus = (student.brs.failure as StudentFailure) ?? StudentFailure.NoFailure
  const actualFailure = student.actual.failure ?? StudentFailure.NoFailure
  let failureStatus = ''
  if (actualFailure === brsFailureStatus) {
    failureStatus = `${formatStudentFailure(actualFailure)}`
  } else {
    failureStatus = `${formatStudentFailure(actualFailure)}!`
    try {
      if (options.save) {
        await brsApi.putStudentFailureAsync(student.brs.studentUuid, discipline, actualFailure)
      }
      updated++
    } catch (error) {
      failed++
    }
  }

  const status = failed > 0 ? 'FAILED ' : updated > 0 ? 'UPDATED' : 'SKIPPED'
  if (options.verbose || failed > 0) {
    const studentName = (student.actual.fullName + '                              ').substr(0, 30)
    log(
      `${status} ${studentName} updated: ${updated}, failed: ${failed}, marks: ${marks.join(
        ' ',
      )}, failureStatus: ${failureStatus}`,
    )
  }
  return status
}

function getSuitableControlAction(config: ControlActionConfig, controlActions: ControlAction[], log: PutMarksLog) {
  const suitableControlActions = controlActions.filter((a) =>
    config.controlActions.some((b) => compareNormalized(a.controlAction, b)),
  )

  if (suitableControlActions.length === 0) {
    log(`All of ${config.controlActions.join(', ')} not found`)
    log(`Known actions: ${controlActions.map((a) => a.controlAction).join(', ')}`)
    return null
  }

  if (config.matchIndex !== undefined || config.matchCount !== undefined) {
    if (
      config.matchIndex === undefined ||
      config.matchCount === undefined ||
      suitableControlActions.length !== config.matchCount ||
      config.matchIndex >= config.matchCount
    ) {
      log(`Invalid configuration of ${config.controlActions.join(', ')}`)
      log(`Can't match: ${config.matchIndex}/${config.matchCount} of ${suitableControlActions.length}`)
      return null
    }
    return suitableControlActions[config.matchIndex]
  }

  if (suitableControlActions.length > 1) {
    log(`Several control actions found for ${config.controlActions.join(', ')}`)
    log(`Found actions: ${suitableControlActions.map((a) => a.controlAction).join(', ')}`)
    return null
  }

  return suitableControlActions[0]
}

async function updateFailuresForSkippedStudentsAsync(
  brsApi: BrsApi,
  students: StudentMark[],
  discipline: Discipline,
  defaultStudentFailure: StudentFailure,
  options: PutMarksOptions,
) {
  const log = resolvePutMarksLog(options)
  const statusCounters: { [k: string]: number } = {}

  for (const student of students) {
    const status = await updateFailureForStudent(brsApi, student, discipline, defaultStudentFailure, options)
    if (statusCounters[status] === undefined) {
      statusCounters[status] = 0
    }
    statusCounters[status]++
  }

  const statusKeys = Object.keys(statusCounters)
  if (statusKeys.length > 0) {
    log('Failures update statuses:')
    for (const k of statusKeys) {
      log(`- ${k} = ${statusCounters[k]}`)
    }
  } else {
    log('No failures for skipped students')
  }
}

async function updateFailureForStudent(
  brsApi: BrsApi,
  student: StudentMark,
  discipline: Discipline,
  defaultStudentFailure: StudentFailure,
  options: PutMarksOptions,
) {
  const log = resolvePutMarksLog(options)
  let status = ''
  const brsFailureStatus = student.failure ? (student.failure as StudentFailure) : StudentFailure.NoFailure
  const actualFailure = defaultStudentFailure
  if (actualFailure === brsFailureStatus) {
    status = 'SKIPPED'
  } else {
    try {
      if (options.save) {
        await brsApi.putStudentFailureAsync(student.studentUuid, discipline, actualFailure)
      }
      status = 'UPDATED'
    } catch (error) {
      status = 'FAILED'
    }
  }

  if (options.verbose || status === 'FAILED') {
    const studentName = (student.studentFio + '                              ').substr(0, 30)
    const description =
      status !== 'SKIPPED'
        ? `${formatStudentFailure(actualFailure)} from ${formatStudentFailure(brsFailureStatus)}`
        : formatStudentFailure(actualFailure)
    log(`${status} ${studentName} ${description}`)
  }
  return status
}

function mergeStudents(actualStudents: ActualStudent[], brsStudents: StudentMark[]) {
  const activeBrsStudents = brsStudents.filter(isStudentActive)

  const mergedStudents: MergedStudent[] = []
  const skippedActualStudents: ActualStudent[] = []
  for (const actualStudent of actualStudents) {
    const suitableStudents = activeBrsStudents.filter((brsStudent) => areStudentsLike(brsStudent, actualStudent))
    if (suitableStudents.length === 1) {
      mergedStudents.push({ actual: actualStudent, brs: suitableStudents[0] })
    } else {
      skippedActualStudents.push(actualStudent)
    }
  }

  const skippedBrsStudents: StudentMark[] = []
  for (const brsStudent of activeBrsStudents) {
    if (!mergedStudents.some((ms) => ms.brs.studentUuid === brsStudent.studentUuid)) {
      skippedBrsStudents.push(brsStudent)
    }
  }

  return { mergedStudents, skippedActualStudents, skippedBrsStudents }
}

function isStudentActive(brsStudent: StudentMark) {
  return brsStudent.studentStatus !== 'Переведен' && brsStudent.studentStatus !== 'Отчислен'
}

function areStudentsLike(brsStudent: StudentMark, actualStudent: ActualStudent) {
  const brsFullName = fio.toKey(brsStudent.studentFio)
  const actualFullName = fio.toKey(actualStudent.fullName)
  return brsFullName.startsWith(actualFullName)
}

function logMergedStudents(
  mergedStudents: MergedStudent[],
  skippedActualStudents: ActualStudent[],
  skippedBrsStudents: StudentMark[],
  log: PutMarksLog,
) {
  log(`Merged students = ${mergedStudents.length}`)
  log(`Can't merge actual students = ${skippedActualStudents.length}`)
  for (const s of skippedActualStudents) {
    log('- ' + s.fullName)
  }
  log(`Can't merge BRS students = ${skippedBrsStudents.length}`)
  for (const s of skippedBrsStudents) {
    log('- ' + s.studentFio)
  }
}

export interface ControlActionConfig {
  controlActions: string[]
  matchIndex?: number
  matchCount?: number
  propertyIndex: number
}

// Вывод строки отчёта о переносе баллов; пустая строка — разделитель.
export type PutMarksLog = (line: string) => void

export interface PutMarksOptions {
  save: boolean
  verbose: boolean
  // Куда писать отчёт; по умолчанию — console.log.
  log?: PutMarksLog
}

function resolvePutMarksLog(options: PutMarksOptions): PutMarksLog {
  return options.log ?? ((line) => console.log(line))
}

interface MergedStudent {
  actual: ActualStudent
  brs: StudentMark
}
