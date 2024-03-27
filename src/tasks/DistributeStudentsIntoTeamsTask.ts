import { ItsApiV2, Project, ProjectSubgroup, StudentInProjectSubgroup } from '../apis/ItsApiV2.js'
import { compareNormalized, startsWithNormalized } from '../helpers/tools.js'
import { TableTask } from './TableTask.js'

export class DistributeStudentsIntoTeamsTaskExecutor {
  itsApi: ItsApiV2

  constructor(itsApi: ItsApiV2) {
    this.itsApi = itsApi
  }

  async executeAsync(tableTask: TableTask) {
    console.log(`🚩 Executing task "${tableTask.name}"`)

    const task = extractTask(tableTask)
    if (!task) {
      console.log(`❌ Execution has been stopped`)
      console.log()
      return
    }

    const projectCollection = await this.itsApi.getProjectListAsync(
      [task.academicYear],
      [task.semester],
      [task.studyYear],
    )

    const groupsByProject = buildGroupsByProject(task, projectCollection.data)

    for (const group of Object.values(groupsByProject)) {
      console.log(`## Project "${group.project.Title}"`)
      const subgroups = await this.itsApi.getProjectSubgroupsAsync(group.project.PeriodId)

      for (const taskStudent of group.taskStudents) {
        if (subgroups.filter((it) => it.Index === taskStudent.projectteam).length === 0) {
          console.log(
            `🔴 Not found team "${taskStudent.projectteam}" for student "${taskStudent.fio}" of "${taskStudent.group}"`,
          )
        }
      }

      for (const subgroup of subgroups) {
        await processTeam(this.itsApi, task, group, subgroup)
      }

      console.log()
    }

    console.log(`✅ Execution has been completed`)
    console.log()
  }
}

function buildGroupsByProject(
  task: DistributeStudentsIntoTeamsTask,
  projects: Project[],
): { [projectId: string]: ProjectGroup } {
  const groupsByProject: { [projectId: string]: ProjectGroup } = {}
  for (const taskStudent of task.students) {
    const project = projects.filter((it) => it.Title === taskStudent.projectname)[0]
    if (project) {
      if (!groupsByProject[project.Id]) {
        groupsByProject[project.Id] = {
          project: project,
          taskStudents: [],
        }
      }
      groupsByProject[project.Id].taskStudents.push(taskStudent)
    } else {
      console.log(
        `🔴 Not found project "${taskStudent.projectname}" for student "${taskStudent.fio}" of "${taskStudent.group}"`,
      )
    }
  }
  return groupsByProject
}

async function processTeam(
  itsApi: ItsApiV2,
  task: DistributeStudentsIntoTeamsTask,
  group: ProjectGroup,
  subgroup: ProjectSubgroup,
) {
  const teamTaskStudents = group.taskStudents.filter((it) => it.projectteam === subgroup.Index)
  if (teamTaskStudents.length > 0) {
    console.log(`### Team "${subgroup.Index}"`)
    const studentCollection = await itsApi.getProjectSubgroupStudentsAsync(
      group.project.PeriodId,
      subgroup.ProjectProgramId,
      subgroup.Index,
    )

    for (const taskStudent of teamTaskStudents) {
      const student: StudentInProjectSubgroup = studentCollection.data.filter(
        (it) => startsWithNormalized(it.FIO, taskStudent.fio || '') && it.GroupName === taskStudent.group,
      )[0]
      if (!student) {
        console.log(`🔴 Not found student "${taskStudent.fio}" of "${taskStudent.group}" at ITS"`)
        continue
      }

      if (student.Signed) {
        console.log(`🟡 Student "${taskStudent.fio}" of "${taskStudent.group}" had been signed before"`)
      } else {
        if (task.save) {
          const subgroupId = subgroup.SubgroupIds[0]
          if (await itsApi.signStudentToProjectSubgroup(student.Id, subgroupId, true)) {
            console.log(`🟢 Student "${taskStudent.fio}" of "${taskStudent.group}" has been signed"`)
          } else {
            console.log(`🔴 Student "${taskStudent.fio}" of "${taskStudent.group}" signing cause an error"`)
          }
        } else {
          console.log(`🟢 Student "${taskStudent.fio}" of "${taskStudent.group}" has been signed"`)
        }
      }
    }

    if (task.save) {
      const afterStudentCollection = await itsApi.getProjectSubgroupStudentsAsync(
        group.project.PeriodId,
        subgroup.ProjectProgramId,
        subgroup.Index,
      )
      for (const taskStudent of teamTaskStudents) {
        const student: StudentInProjectSubgroup = afterStudentCollection.data.filter(
          (it) => startsWithNormalized(it.FIO, taskStudent.fio || '') && it.GroupName === taskStudent.group,
        )[0]
        if (student && !student.Signed) {
          console.log(`🔴 Student "${taskStudent.fio}" of "${taskStudent.group}" is not updated..."`)
        }
      }
    }
    console.log()
  }
}

function extractTask(tableTask: TableTask): DistributeStudentsIntoTeamsTask | null {
  const academicYear = tableTask.getCustomParam('academicYear', (it) => parseInt(it.split('/')[0], 10))
  if (academicYear === null) {
    console.log('- academicYear is required❗')
    return null
  }
  console.log(`- academicYear: ${academicYear}`)

  const semester = tableTask.getCustomParam('semester', (it) =>
    compareNormalized(it, 'fall') ? 1 : compareNormalized(it, 'spring') ? 2 : null,
  )
  if (semester === null) {
    console.log('- semester is required❗')
    return null
  }
  console.log(`- semester: ${semester}`)

  const studyYear = tableTask.getIntParam('studyYear')
  if (studyYear === null) {
    console.log('- studyYear is required❗')
    return null
  }
  console.log(`- studyYear: ${studyYear}`)

  const save = tableTask.getBoolParam('save') || false
  console.log(save ? `- save mode on ⚡`: `- save mode off`)

  const students = tableTask.rows.map(convertRow2Student).filter((it) => it !== null) as Student[]
  if (students.length < tableTask.rows.length) {
    console.log(`- ${students.length} students was found in ${tableTask.rows.length} rows❗`)
  } else {
    console.log(`- ${students.length} students was found.`)
  }

  console.log()

  return {
    name: tableTask.name,
    save,
    academicYear,
    semester,
    studyYear,
    students,
  }
}

function convertRow2Student(row: { [key: string]: string }): Student | null {
  if (!row.fio || !row.group || !row.projectname || !row.projectteam) {
    return null
  }
  return {
    fio: row.fio,
    group: row.group,
    projectname: row.projectname,
    projectteam: parseInt(row.projectteam || '0', 10),
  }
}

interface DistributeStudentsIntoTeamsTask {
  name: string
  save: boolean
  academicYear: number
  semester: number
  studyYear: number
  students: Array<Student>
}

interface Student {
  fio: string
  group: string
  projectname: string
  projectteam: number
}

type ProjectGroup = { taskStudents: Array<Student>; project: Project }
