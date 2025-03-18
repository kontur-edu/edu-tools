import { TeamProjectApiV2, Workspace } from '../apis/TeamProjectApiV2.js'
import { compareNormalized, startsWithNormalized } from '../helpers/tools.js'
import { TableTask, TableTaskValue } from './TableTask.js'
import { WorkspaceInfo } from './WorkspaceInfo.js'

export class SendCuratorMarksTaskExecutor {
  teamProjectApi: TeamProjectApiV2

  constructor(teamProjectApi: TeamProjectApiV2) {
    this.teamProjectApi = teamProjectApi
  }

  async executeAsync(tableTask: TableTask) {
    console.log(`🚩 Выполнение задания "${tableTask.name}"`)

    const task = extractTask(tableTask)
    if (!task) {
      console.log(`❌ Выполнение задания остановлено`)
      console.log()
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

    console.log(`✅ Выполнение задания завершено`)
  }

  async executeProjectAsync(project: Workspace, task: SendCuratorMarksTask, marks: Array<StudentMark>) {
    console.log('## Проект', project.title, project.instanceNumber)

    const iterations = (await this.teamProjectApi.getIterationsAsync(project.id)) || []
    const iteration = iterations[task.iterationNumber - 1]
    if (!iteration) {
      console.log(`❌ Не удалось найти итерацию "${task.iterationNumber}"`)
      console.log()
      return marks
    }
    const scores = await this.teamProjectApi.getIterationScoresAsync(iteration.id.toString())
    if (!scores) {
      console.log(`❌ Не удалось получить оценки для итерации "${task.iterationNumber}"`)
      console.log()
      return marks
    }
    if (!scores.thematicGroups || !scores.thematicGroups[0] || !scores.thematicGroups[0].students) {
      console.log(`❌ Не удалось получить списка студентов проекта`)
      console.log()
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
        console.log(`🟡 Студент "${studentMark.student}" не найден в указанном проекте`)
        continue
      }

      if (isNaN(studentMark.mark)) {
        console.log(`🟡 Студент "${studentMark.student}" проигнорирован`)
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
          console.log(`🟢 Студенту "${studentMark.student}" выставлена оценка ${studentMark.mark}`)
        } else {
          console.log(
            `🔴 Студенту "${studentMark.student}" не выставлена оценка ${studentMark.mark}, текущая оцека ${projectStudent.score}`,
          )
          failedMarks++
        }
      } else {
        console.log(`🟡 Студенту "${studentMark.student}" уже выставлена оценка ${studentMark.mark}`)
      }

      projectStudents = projectStudents.filter((it) => it.studentId !== projectStudent.studentId)
      marks = marks.filter((it) => it !== studentMark)
    }

    if (projectStudents.length > 0) {
      for (const projectStudent of projectStudents) {
        console.log(
          `🔴 Студент "${projectStudent.person.fullname}" найден в проекте, но для него не была указана оценка`,
        )
      }

      console.log(`🟥 Не для всех студентов проекта указаны оценки`)
    } else if (failedMarks > 0) {
      console.log(`🟥 Не удалось выставить все оценки`)
    } else {
      console.log(`🟩 Всем студентам проекта выставлены оценки`)
    }
    console.log()

    return marks
  }

  logTotals(marks: Array<StudentMark>) {
    console.log(`# Итоги`)
    if (marks.length > 0) {
      let errorCount = 0
      for (const studentMark of marks) {
        if (studentMark.workspaceInfo && studentMark.workspaceInfo.key) {
          console.log(`🔴 Студент "${studentMark.student}" не найден ни в одном из проектов`)
          errorCount++
        } else {
          console.log(`🟡 Студент "${studentMark.student}" без проекта проигнорирован`)
        }
      }

      if (errorCount > 0) {
        console.log(`🟥 Не все студенты найдены в проектах`)
      } else {
        console.log(`🟨 Все студенты найдены в проектах, кроме студентов без проектов`)
      }
    } else {
      console.log(`🟩 Все студенты найдены в проектах`)
    }
    console.log()
  }
}

function extractTask(tableTask: TableTask): SendCuratorMarksTask | null {
  const academicYear = tableTask.getParam('academicYear').getCustom((it) => parseInt(it.split('/')[0], 10))
  if (academicYear === null) {
    console.log('- academicYear необходим❗')
    return null
  }
  console.log(`- academicYear: ${academicYear}`)

  const semester = tableTask
    .getParam('semester')
    .getCustom((it) => (compareNormalized(it, 'fall') ? 1 : compareNormalized(it, 'spring') ? 2 : null))
  if (semester === null) {
    console.log('- semester необходим❗')
    return null
  }
  console.log(`- semester: ${semester}`)

  const save = tableTask.getParam('save').getBool() || false
  console.log(save ? `- режим save включен ⚡` : `- режим save выключен`)

  const iterationNumber = tableTask.getParam('iterationNumber').getInt()
  if (iterationNumber === null) {
    console.log('- iterationNumber необходим❗')
    return null
  }
  console.log(`- iterationNumber: ${iterationNumber}`)

  const marks = tableTask.rows
    .map((it) => convertRow2StudentMark(it, iterationNumber))
    .filter((it) => it !== null) as StudentMark[]

  console.log()

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
