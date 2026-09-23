import { TeamProjectApiV2, Workspace } from '../apis/TeamProjectApiV2'
import { compareNormalized, startsWithNormalized } from '../helpers/tools'
import { TableTask, TableTaskValue } from './TableTask'
import { TaskReporter } from './TaskReporter'
import { WorkspaceInfo, workspaceScope } from './WorkspaceInfo'

export class SendCuratorMarksTaskExecutor {
  static readonly TASK_NAME = 'SendCuratorMarks'
  
  reporter: TaskReporter
  teamProjectApi: TeamProjectApiV2

  constructor(teamProjectApi: TeamProjectApiV2, reporter: TaskReporter | null) {
    this.teamProjectApi = teamProjectApi
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

    this.logTotals(tableTask.name, marks)

    this.reporter.finished(tableTask.name, 'Execution has been finished')
  }

  async executeProjectAsync(project: Workspace, task: SendCuratorMarksTask, marks: Array<StudentMark>) {
    this.reporter.heading(2, `Project "${project.title}" ${project.instanceNumber}`)
    const projectScope = workspaceScope(project)

    const iterations = (await this.teamProjectApi.getIterationsAsync(project.id)) || []
    const iteration = iterations[task.iterationNumber - 1]
    if (!iteration) {
      this.reporter.error(projectScope, `Не удалось найти итерацию "${task.iterationNumber}"`, { stopped: true })
      this.reporter.separator()
      return marks
    }
    const scores = await this.teamProjectApi.getIterationScoresAsync(iteration.id.toString())
    if (!scores) {
      this.reporter.error(projectScope, `Failed to get scores for iteration "${task.iterationNumber}"`, { stopped: true })
      this.reporter.separator()
      return marks
    }
    if (!scores.thematicGroups || !scores.thematicGroups[0] || !scores.thematicGroups[0].students) {
      this.reporter.error(projectScope, 'Failed to get list of project students', { stopped: true })
      this.reporter.separator()
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
        this.reporter.skipped(studentMark.student, `Student "${studentMark.student}" not found in specified project`)
        continue
      }

      if (isNaN(studentMark.mark)) {
        this.reporter.skipped(studentMark.student, `Student "${studentMark.student}" ignored`)
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
          this.reporter.changed(studentMark.student, `Student "${studentMark.student}" has been rated ${studentMark.mark}`, {
            mark: studentMark.mark,
          })
        } else {
          this.reporter.error(
            studentMark.student,
            `Student "${studentMark.student}" not rated ${studentMark.mark}, current score ${projectStudent.score}`,
            { details: { mark: studentMark.mark, currentScore: projectStudent.score } },
          )
          failedMarks++
        }
      } else {
        this.reporter.unchanged(studentMark.student, `Student "${studentMark.student}" already has been rated ${studentMark.mark}`, {
          mark: studentMark.mark,
        })
      }

      projectStudents = projectStudents.filter((it) => it.studentId !== projectStudent.studentId)
      marks = marks.filter((it) => it !== studentMark)
    }

    if (projectStudents.length > 0) {
      for (const projectStudent of projectStudents) {
        this.reporter.error(
          projectStudent.person.fullname,
          `Student "${projectStudent.person.fullname}" found in project, but no rating was specified`,
        )
      }

      this.reporter.verdict('failed', projectScope, 'Not all project students have been rated')
    } else if (failedMarks > 0) {
      this.reporter.verdict('failed', projectScope, 'Failed to rate all students')
    } else {
      this.reporter.verdict('ok', projectScope, 'All project students have been rated')
    }
    this.reporter.separator()

    return marks
  }

  logTotals(taskName: string, marks: Array<StudentMark>) {
    this.reporter.heading(1, 'Totals')
    if (marks.length > 0) {
      let errorCount = 0
      for (const studentMark of marks) {
        if (studentMark.workspaceInfo && studentMark.workspaceInfo.key) {
          this.reporter.error(studentMark.student, `Student "${studentMark.student}" not found in any project`)
          errorCount++
        } else {
          this.reporter.skipped(studentMark.student, `Student "${studentMark.student}" without project ignored`)
        }
      }

      if (errorCount > 0) {
        this.reporter.verdict('failed', taskName, 'Not all students found in projects')
      } else {
        this.reporter.verdict('attention', taskName, 'All students found in projects, except students without projects')
      }
    } else {
      this.reporter.verdict('ok', taskName, 'All students found in projects')
    }
    this.reporter.separator()
  }
}

function extractTask(tableTask: TableTask, reporter: TaskReporter, forceSave: boolean | null): SendCuratorMarksTask | null {
  const academicYear = tableTask.getParam('academicYear').getCustom((it) => parseInt(it.split('/')[0], 10))
  if (academicYear === null) {
    reporter.note('academicYear required', true)
    return null
  }
  reporter.note(`academicYear: ${academicYear}`)

  const semester = tableTask
    .getParam('semester')
    .getCustom((it) => (compareNormalized(it, 'fall') ? 1 : compareNormalized(it, 'spring') ? 2 : null))
  if (semester === null) {
    reporter.note('semester required', true)
    return null
  }
  reporter.note(`semester: ${semester}`)

  let save = tableTask.getParam('save').getBool() || false
  if (forceSave !== null) {
    save = forceSave
  }
  reporter.note(save ? 'режим save включен ⚡' : 'режим save выключен')

  const iterationNumber = tableTask.getParam('iterationNumber').getInt()
  if (iterationNumber === null) {
    reporter.note('iterationNumber required', true)
    return null
  }
  reporter.note(`iterationNumber: ${iterationNumber}`)

  const marks = tableTask.rows
    .map((it) => convertRow2StudentMark(it, iterationNumber))
    .filter((it) => it !== null) as StudentMark[]

  reporter.separator()

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
