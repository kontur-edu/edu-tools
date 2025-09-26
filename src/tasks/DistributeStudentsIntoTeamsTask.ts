import { ItsApiV2, Project, ProjectSubgroup, StudentInProjectSubgroup } from '../apis/ItsApiV2'
import { compareNormalized, fixSpaces, startsWithNormalized } from '../helpers/tools'
import { TableTask } from './TableTask'
import { ConsoleTableTaskLogger, TableTaskLogger } from './TableTaskLogger'

export class DistributeStudentsIntoTeamsTaskExecutor {
  static readonly TASK_NAME = 'DistributeStudentsIntoTeams'
  
  itsApi: ItsApiV2
  tableTaskLogger: TableTaskLogger

  constructor(itsApi: ItsApiV2, tableTaskLogger: TableTaskLogger | null) {
    this.itsApi = itsApi
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

    const projectCollection = await this.itsApi.getProjectListAsync(
      [task.academicYear],
      [task.semester],
      [task.studyYear],
    )

    const groupsByProject = this.buildGroupsByProject(task, projectCollection.data)

    for (const group of Object.values(groupsByProject)) {
      this.tableTaskLogger.log(`## Project "${group.project.Title}"`)
      const subgroups = await this.itsApi.getProjectSubgroupsAsync(group.project.PeriodId)

      for (const taskStudent of group.taskStudents) {
        if (subgroups.filter((it) => it.Index === taskStudent.projectinstancenumber).length === 0) {
          this.tableTaskLogger.log(
            `🔴 Not found team "${taskStudent.projectinstancenumber}" for student "${taskStudent.fio}" of "${taskStudent.group}"`,
          )
        }
      }

      for (const subgroup of subgroups) {
        await this.processTeam(this.itsApi, task, group, subgroup)
      }

      this.tableTaskLogger.log()
    }

    this.tableTaskLogger.log(`✅ Execution has been completed`)
    this.tableTaskLogger.log()
  }

  private buildGroupsByProject(
    task: DistributeStudentsIntoTeamsTask,
    projects: Project[],
  ): { [projectId: string]: ProjectGroup } {
    console.log(projects)
    const groupsByProject: { [projectId: string]: ProjectGroup } = {}
    for (const taskStudent of task.students) {
      const project = projects.filter((it) => compareNormalized(it.Title, taskStudent.projectname))[0]
      if (project) {
        if (!groupsByProject[project.Id]) {
          groupsByProject[project.Id] = {
            project: project,
            taskStudents: [],
          }
        }
        groupsByProject[project.Id].taskStudents.push(taskStudent)
      } else {
        this.tableTaskLogger.log(
          `🔴 Not found project "${taskStudent.projectname}" for student "${taskStudent.fio}" of "${taskStudent.group}"`,
        )
      }
    }
    return groupsByProject
  }
  
  private async processTeam(
    itsApi: ItsApiV2,
    task: DistributeStudentsIntoTeamsTask,
    group: ProjectGroup,
    subgroup: ProjectSubgroup,
  ) {
    const teamTaskStudents = group.taskStudents.filter((it) => it.projectinstancenumber === subgroup.Index)
    if (teamTaskStudents.length > 0) {
      this.tableTaskLogger.log(`### Team "${subgroup.Index}"`)
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
          this.tableTaskLogger.log(`🔴 Not found student "${taskStudent.fio}" of "${taskStudent.group}" at ITS"`)
          continue
        }
  
        if (student.Signed) {
          this.tableTaskLogger.log(`🟡 Student "${taskStudent.fio}" of "${taskStudent.group}" had been signed before"`)
        } else {
          if (task.save) {
            const subgroupId = subgroup.SubgroupIds[0]
            if (await itsApi.signStudentToProjectSubgroup(student.Id, subgroupId, true)) {
              this.tableTaskLogger.log(`🟢 Student "${taskStudent.fio}" of "${taskStudent.group}" has been signed"`)
            } else {
              this.tableTaskLogger.log(`🔴 Student "${taskStudent.fio}" of "${taskStudent.group}" signing cause an error"`)
            }
          } else {
            this.tableTaskLogger.log(`🟢 Student "${taskStudent.fio}" of "${taskStudent.group}" has been signed"`)
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
}

function extractTask(tableTask: TableTask, tableTaskLogger: TableTaskLogger, forceSave: boolean | null = null): DistributeStudentsIntoTeamsTask | null {
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

  const studyYear = tableTask.getParam('studyYear').getInt()
  if (studyYear === null) {
    tableTaskLogger.log('- studyYear is required❗')
    return null
  }
  tableTaskLogger.log(`- studyYear: ${studyYear}`)

  let save = tableTask.getParam('save').getBool() || false
  if (forceSave !== null) {
    save = forceSave
  }
  tableTaskLogger.log(save ? `- save mode on ⚡` : `- save mode off`)

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
  if (!row.fio || !row.group || !row.projectname || !row.projectinstancenumber) {
    return null
  }
  return {
    fio: row.fio,
    group: row.group,
    projectname: row.projectname,
    projectinstancenumber: parseInt(row.projectinstancenumber || '0', 10),
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
  projectinstancenumber: number
}

type ProjectGroup = { taskStudents: Array<Student>; project: Project }
