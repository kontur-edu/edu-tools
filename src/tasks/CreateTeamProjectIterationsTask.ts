import { IterationItem, TeamProjectApiV2, Workspace } from '../apis/TeamProjectApiV2'
import JustDate from '../helpers/JustDate'
import { compareNormalized } from '../helpers/tools'
import { TableTask } from './TableTask'
import { TaskReporter } from './TaskReporter'
import { WorkspaceInfo, workspaceScope } from './WorkspaceInfo'

export class CreateTeamProjectIterationsTaskExecutor {
  static readonly TASK_NAME = 'CreateTeamProjectIterations'

  teamProjectApi: TeamProjectApiV2
  reporter: TaskReporter
  
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

    const suitableWorkspaces = await WorkspaceInfo.getWorkspacesByInfosAsync(
      this.teamProjectApi,
      task.academicYear,
      task.semester,
      task.workspaceInfos,
    )

    for (const project of suitableWorkspaces) {
      await this.executeProjectAsync(project, task)
    }

    this.reporter.finished(tableTask.name, 'Execution has been completed')
  }

  async executeProjectAsync(project: Workspace, task: CreateTeamProjectIterationsTask) {
    this.reporter.heading(2, `Project "${project.title}" "${project.instanceNumber}"`)
    const projectScope = workspaceScope(project)

    const tpIterations = await this.teamProjectApi.getIterationsAsync(project.id)
    if (!tpIterations) {
      this.reporter.verdict('failed', projectScope, 'Iterations of project not found')
      this.reporter.separator()
      return
    }

    if (tpIterations.length > 0) {
      this.reporter.heading(3, 'Updating iterations of project:')
      for (const tpIteration of tpIterations) {
        for (const iteration of task.iterations) {
          await this.tryUpdateIteration(
            this.teamProjectApi,
            projectScope,
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
      this.reporter.heading(3, 'Adding missing iterations...')
      for (let i = tpIterations.length; i < task.iterations.length; i++) {
        const it = task.iterations[i]
        if (task.save) {
          await this.teamProjectApi.postIterationAsync(project.id, it.name, '', it.startdate, it.enddate)
        }
        const from = it.startdate.toDashedString()
        const to = it.enddate.toDashedString()
        this.reporter.changed(`${projectScope} / ${it.name}`, `added: "${it.name}" from ${from} to ${to}`, { from, to })
      }
    }

    this.reporter.verdict('ok', projectScope, 'Iterations are ready')
    this.reporter.separator()
  }

  async tryUpdateIteration(
    teamProjectApi: TeamProjectApiV2,
    projectScope: string,
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
      const scope = `${projectScope} / ${iterationItem.title}`
      if (!iteration) {
        this.reporter.error(scope, `iteration not found: "${iterationItem.title}"`)
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
        this.reporter.changed(scope, `updated: "${iteration.title}" from ${beginning} to ${ending}`, { from: beginning, to: ending })
      } else {
        this.reporter.unchanged(
          scope,
          `without changes: "${iteration.title}" from ${iteration.dates.beginning} to ${iteration.dates.ending}`,
          { from: iteration.dates.beginning, to: iteration.dates.ending },
        )
      }
    }
  }
}

function extractTask(tableTask: TableTask, reporter: TaskReporter, forceSave: boolean | null = null): CreateTeamProjectIterationsTask | null {
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
  reporter.note(save ? 'save mode on ⚡' : 'save mode off')

  const workspaceInfos = tableTask.rows.map(WorkspaceInfo.extractFromRow).filter((it) => it !== null) as WorkspaceInfo[]

  let iterations: Array<Iteration> = []
  const iterationRows = tableTask.rowsByNamespace['iteration']
  if (iterationRows) {
    iterations = iterationRows.map(convertRow2Iteration).filter((it) => it !== null) as Iteration[]
    if (iterations.length < iterationRows.length) {
      reporter.note(`iterations found: ${iterations.length}. But more rows: ${iterationRows.length}`, true)
    } else {
      reporter.note(`iterations found: ${iterations.length}.`)
    }
  }

  reporter.separator()

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
