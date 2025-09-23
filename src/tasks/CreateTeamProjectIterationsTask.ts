import { IterationItem, TeamProjectApiV2, Workspace } from '../apis/TeamProjectApiV2'
import JustDate from '../helpers/JustDate'
import { compareNormalized } from '../helpers/tools'
import { TableTask } from './TableTask'
import { ConsoleTableTaskLogger, TableTaskLogger } from './TableTaskLogger'
import { WorkspaceInfo } from './WorkspaceInfo'

export class CreateTeamProjectIterationsTaskExecutor {
  static readonly TASK_NAME = 'CreateTeamProjectIterations'

  teamProjectApi: TeamProjectApiV2
  tableTaskLogger: TableTaskLogger
  
  constructor(teamProjectApi: TeamProjectApiV2, tableTaskLogger: TableTaskLogger | null) {
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

    const suitableWorkspaces = await WorkspaceInfo.getWorkspacesByInfosAsync(
      this.teamProjectApi,
      task.academicYear,
      task.semester,
      task.workspaceInfos,
    )

    for (const project of suitableWorkspaces) {
      await this.executeProjectAsync(project, task)
    }

    this.tableTaskLogger.log(`✅ Execution has been completed`)
  }

  async executeProjectAsync(project: Workspace, task: CreateTeamProjectIterationsTask) {
    this.tableTaskLogger.log(`## Project "${project.title}" "${project.instanceNumber}"`)

    const tpIterations = await this.teamProjectApi.getIterationsAsync(project.id)
    if (!tpIterations) {
      this.tableTaskLogger.log(`🟥 Iterations of project not found`)
      this.tableTaskLogger.log()
      return
    }

    if (tpIterations.length > 0) {
      this.tableTaskLogger.log('### Updating iterations of project:')
      for (const tpIteration of tpIterations) {
        for (const iteration of task.iterations) {
          await this.tryUpdateIteration(
            this.teamProjectApi,
            tpIteration,
            iteration.name,
            iteration.startdate,
            iteration.enddate,
            task.save,
          )
        }
      }
    }
    if (tpIterations.length < task.iterations.length) {
      this.tableTaskLogger.log('### Adding missing iterations...')
      for (let i = tpIterations.length; i < task.iterations.length; i++) {
        const it = task.iterations[i]
        if (task.save) {
          await this.teamProjectApi.postIterationAsync(project.id, it.name, '', it.startdate, it.enddate)
        }
        this.tableTaskLogger.log(`🟢 added: "${it.name}" from ${it.startdate.toDashedString()} to ${it.enddate.toDashedString()}`)
      }
    }

    this.tableTaskLogger.log(`🟩 Iterations are ready`)
    this.tableTaskLogger.log()
  }

  async tryUpdateIteration(
    teamProjectApi: TeamProjectApiV2,
    iterationItem: IterationItem,
    iterationName: string,
    startDate: JustDate,
    endDate: JustDate,
    save: boolean,
  ) {
    if (iterationItem.title === iterationName) {
      const iteration = await teamProjectApi.getIterationAsync(iterationItem.id)
      const beginning = startDate.toDashedString()
      const ending = endDate.toDashedString()
      if (!iteration) {
        this.tableTaskLogger.log(`🔴 iteration not found: "${iterationItem.title}"`)
      }
      else if (
        !iteration.dates ||
        !iteration.dates.beginning ||
        iteration.dates.beginning != beginning ||
        !iteration.dates.ending ||
        iteration.dates.ending != ending
      ) {
        if (save) {
          await teamProjectApi.putIterationAsync(iteration.id, iteration.title, iteration.description, startDate, endDate)
        }
        this.tableTaskLogger.log(`🟢 updated: "${iteration.title}" from ${beginning} to ${ending}`)
      } else {
        this.tableTaskLogger.log(`🟡 without changes: "${iteration.title}" from ${iteration.dates.beginning} to ${iteration.dates.ending}`)
      }
    }
  }
}

function extractTask(tableTask: TableTask, tableTaskLogger: TableTaskLogger, forceSave: boolean | null = null): CreateTeamProjectIterationsTask | null {
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
  tableTaskLogger.log(save ? `- save mode on ⚡` : `- save mode off`)

  const workspaceInfos = tableTask.rows.map(WorkspaceInfo.extractFromRow).filter((it) => it !== null) as WorkspaceInfo[]

  let iterations: Array<Iteration> = []
  const iterationRows = tableTask.rowsByNamespace['iteration']
  if (iterationRows) {
    iterations = iterationRows.map(convertRow2Iteration).filter((it) => it !== null) as Iteration[]
    if (iterations.length < iterationRows.length) {
      tableTaskLogger.log(`- iterations found: ${iterations.length}. But more rows: ${iterationRows.length}❗`)
    } else {
      tableTaskLogger.log(`- iterations found: ${iterations.length}.`)
    }
  }

  tableTaskLogger.log()

  return {
    name: tableTask.name,
    save,
    academicYear,
    semester,
    iterations: iterations,
    workspaceInfos,
  }
}

function convertRow2Iteration(row: { [key: string]: string }): Iteration | null {
  if (!row.name || !row.startdate || !row.enddate) {
    return null
  }
  return {
    name: row.name,
    startdate: JustDate.fromString(row.startdate),
    enddate: JustDate.fromString(row.enddate),
  }
}

interface CreateTeamProjectIterationsTask {
  name: string
  save: boolean
  academicYear: number
  semester: 1 | 2
  iterations: Array<Iteration>
  workspaceInfos: Array<WorkspaceInfo>
}

interface Iteration {
  name: string
  startdate: JustDate
  enddate: JustDate
}
