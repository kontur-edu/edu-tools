import { TeamProjectApiV2, Workspace } from '../apis/TeamProjectApiV2'
import { compareNormalized, startsWithNormalized } from '../helpers/tools'
import { TableTask, TableTaskValue } from './TableTask'
import { ConsoleTableTaskLogger, TableTaskLogger } from './TableTaskLogger'
import { WorkspaceInfo } from './WorkspaceInfo'

export class SendCuratorMarksTaskExecutor {
  teamProjectApi: TeamProjectApiV2
  tableTaskLogger: TableTaskLogger

  constructor(teamProjectApi: TeamProjectApiV2, tableTaskLogger?: TableTaskLogger) {
    this.teamProjectApi = teamProjectApi
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

    const workspaceInfos = task.marks.map((it) => it.workspaceInfo).filter((it) => it !== null) as WorkspaceInfo[]
    const suitableWorkspaces = await WorkspaceInfo.getWorkspacesByInfosAsync(
      this.teamProjectApi,
      task.academicYear,
      task.semester,
      workspaceInfos,
    )

    let marks = [...task.marks]
    for (const workspace of suitableWorkspaces) {
      marks = await this.executeProjectAsync(workspace, task, marks)
    }

    this.logTotals(marks)

    this.tableTaskLogger.log(`✅ Execution has been finished`)
  }

  async executeProjectAsync(project: Workspace, task: SendCuratorMarksTask, marks: Array<StudentMark>) {
    this.tableTaskLogger.log(`## Project "${project.title}" ${project.instanceNumber}`)

    const iterations = (await this.teamProjectApi.getIterationsAsync(project.id)) || []
    const iteration = iterations[task.iterationNumber - 1]
    if (!iteration) {
      this.tableTaskLogger.log(`❌ Не удалось найти итерацию "${task.iterationNumber}"`)
      this.tableTaskLogger.log()
      return marks
    }
    const scores = await this.teamProjectApi.getIterationScoresAsync(iteration.id.toString())
    if (!scores) {
      this.tableTaskLogger.log(`❌ Failed to get scores for iteration "${task.iterationNumber}"`)
      this.tableTaskLogger.log()
      return marks
    }
    if (!scores.thematicGroups || !scores.thematicGroups[0] || !scores.thematicGroups[0].students) {
      this.tableTaskLogger.log(`❌ Failed to get list of project students`)
      this.tableTaskLogger.log()
      return marks
    }

    const studentMarks = task.marks.filter((it) => it.workspaceInfo?.checkMatch(project))
    let projectStudents = [...scores.thematicGroups[0].students]
    let failedMarks = 0
    for (const studentMark of studentMarks) {
      const projectStudent = projectStudents.filter((it) =>
        startsWithNormalized(it.person.fullname, studentMark.student),
      )[0]
      if (!projectStudent) {
        this.tableTaskLogger.log(`🟡 Student "${studentMark.student}" not found in specified project`)
        continue
      }

      if (isNaN(studentMark.mark)) {
        this.tableTaskLogger.log(`🟡 Student "${studentMark.student}" ignored`)
      } else if (projectStudent.score !== studentMark.mark) {
        let result = true
        if (task.save) {
          result = await this.teamProjectApi.putCuratorScoreAsync(
            iteration.id,
            projectStudent.studentId,
            studentMark.mark,
          )
        }
        if (result) {
          this.tableTaskLogger.log(`🟢 Student "${studentMark.student}" has been rated ${studentMark.mark}`)
        } else {
          this.tableTaskLogger.log(
            `🔴 Student "${studentMark.student}" not rated ${studentMark.mark}, current score ${projectStudent.score}`,
          )
          failedMarks++
        }
      } else {
        this.tableTaskLogger.log(`🟡 Student "${studentMark.student}" already has been rated ${studentMark.mark}`)
      }

      projectStudents = projectStudents.filter((it) => it.studentId !== projectStudent.studentId)
      marks = marks.filter((it) => it !== studentMark)
    }

    if (projectStudents.length > 0) {
      for (const projectStudent of projectStudents) {
        this.tableTaskLogger.log(
          `🔴 Student "${projectStudent.person.fullname}" found in project, but no rating was specified`,
        )
      }

      this.tableTaskLogger.log(`🟥 Not all project students have been rated`)
    } else if (failedMarks > 0) {
      this.tableTaskLogger.log(`🟥 Failed to rate all students`)
    } else {
      this.tableTaskLogger.log(`🟩 All project students have been rated`)
    }
    this.tableTaskLogger.log()

    return marks
  }

  logTotals(marks: Array<StudentMark>) {
    this.tableTaskLogger.log(`# Totals`)
    if (marks.length > 0) {
      let errorCount = 0
      for (const studentMark of marks) {
        if (studentMark.workspaceInfo && studentMark.workspaceInfo.key) {
          this.tableTaskLogger.log(`🔴 Student "${studentMark.student}" not found in any project`)
          errorCount++
        } else {
          this.tableTaskLogger.log(`🟡 Student "${studentMark.student}" without project ignored`)
        }
      }

      if (errorCount > 0) {
        this.tableTaskLogger.log(`🟥 Not all students found in projects`)
      } else {
        this.tableTaskLogger.log(`🟨 All students found in projects, except students without projects`)
      }
    } else {
      this.tableTaskLogger.log(`🟩 All students found in projects`)
    }
    this.tableTaskLogger.log()
  }
}

function extractTask(tableTask: TableTask, tableTaskLogger: TableTaskLogger, forceSave: boolean | null): SendCuratorMarksTask | null {
  const academicYear = tableTask.getParam('academicYear').getCustom((it) => parseInt(it.split('/')[0], 10))
  if (academicYear === null) {
    tableTaskLogger.log('- academicYear required❗')
    return null
  }
  tableTaskLogger.log(`- academicYear: ${academicYear}`)

  const semester = tableTask
    .getParam('semester')
    .getCustom((it) => (compareNormalized(it, 'fall') ? 1 : compareNormalized(it, 'spring') ? 2 : null))
  if (semester === null) {
    tableTaskLogger.log('- semester required❗')
    return null
  }
  tableTaskLogger.log(`- semester: ${semester}`)

  let save = tableTask.getParam('save').getBool() || false
  if (forceSave !== null) {
    save = forceSave
  }
  tableTaskLogger.log(save ? `- режим save включен ⚡` : `- режим save выключен`)

  const iterationNumber = tableTask.getParam('iterationNumber').getInt()
  if (iterationNumber === null) {
    tableTaskLogger.log('- iterationNumber required❗')
    return null
  }
  tableTaskLogger.log(`- iterationNumber: ${iterationNumber}`)

  const marks = tableTask.rows
    .map((it) => convertRow2StudentMark(it, iterationNumber))
    .filter((it) => it !== null) as StudentMark[]

  tableTaskLogger.log()

  return {
    name: tableTask.name,
    save,
    iterationNumber: iterationNumber,
    academicYear,
    semester,
    marks: marks,
  }
}

function convertRow2StudentMark(row: { [key: string]: string }, iterationNumber: number): StudentMark | null {
  if (row.skip && row.skip.length) {
    return null
  }

  const student = TableTaskValue.extract(row, 'student').getString()
  const curator = TableTaskValue.extract(row, 'curator').getString()
  const mark = TableTaskValue.extract(row, `iteration${iterationNumber}`).getInt()

  if (student !== null && curator !== null && mark !== null) {
    const workspaceInfo = WorkspaceInfo.extractFromRow(row)

    return {
      student,
      curator,
      workspaceInfo,
      mark,
    }
  }
  return null
}

interface SendCuratorMarksTask {
  name: string
  save: boolean
  academicYear: number
  semester: 1 | 2
  iterationNumber: number
  marks: Array<StudentMark>
}

interface StudentMark {
  student: string
  curator: string
  workspaceInfo: WorkspaceInfo | null
  mark: number
}

interface ProjectInfo {
  url: string | null
  name: string | null
  number: number | null
  id: string | null
  key: string | null
}
