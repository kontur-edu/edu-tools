import { IterationItem, TeamProjectApiV2, Workspace } from '../apis/TeamProjectApiV2'
import JustDate from '../helpers/JustDate'
import { compareNormalized } from '../helpers/tools'
import { TableTask } from './TableTask'
import { WorkspaceInfo } from './WorkspaceInfo'

export class CreateTeamProjectIterationsTaskExecutor {
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

    const suitableWorkspaces = await WorkspaceInfo.getWorkspacesByInfosAsync(
      this.teamProjectApi,
      task.academicYear,
      task.semester,
      task.workspaceInfos,
    )

    for (const project of suitableWorkspaces) {
      await this.executeProjectAsync(project, task)
    }

    console.log(`✅ Выполнение задания завершено`)
  }

  async executeProjectAsync(project: Workspace, task: CreateTeamProjectIterationsTask) {
    console.log('## Проект', project.title, project.instanceNumber)

    const tpIterations = await this.teamProjectApi.getIterationsAsync(project.id)
    if (!tpIterations) {
      console.log(`🟥 Итерации проекта не найдены`)
      console.log()
      return
    }

    if (tpIterations.length > 0) {
      console.log('### Обновление итераций проекта:')
      for (const tpIteration of tpIterations) {
        for (const iteration of task.iterations) {
          await tryUpdateIteration(
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
      console.log('### Добавление недостающих итераций...')
      for (let i = tpIterations.length; i < task.iterations.length; i++) {
        const it = task.iterations[i]
        if (task.save) {
          await this.teamProjectApi.postIterationAsync(project.id, it.name, '', it.startdate, it.enddate)
        }
        console.log(`🟢 добавлено: "${it.name}" с ${it.startdate.toDashedString()} по ${it.enddate.toDashedString()}`)
      }
    }

    console.log(`🟩 Итерации готовы`)
    console.log()
  }
}

async function tryUpdateIteration(
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
      console.log(`🔴 не найдена итерация: "${iterationItem.title}"`)
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
      console.log(`🟢 обновлено: "${iteration.title}" с ${beginning} по ${ending}`)
    } else {
      console.log(`🟡 без изменений: "${iteration.title}" с ${iteration.dates.beginning} по ${iteration.dates.ending}`)
    }
  }
}

function extractTask(tableTask: TableTask): CreateTeamProjectIterationsTask | null {
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

  const workspaceInfos = tableTask.rows.map(WorkspaceInfo.extractFromRow).filter((it) => it !== null) as WorkspaceInfo[]

  let iterations: Array<Iteration> = []
  const iterationRows = tableTask.rowsByNamespace['iteration']
  if (iterationRows) {
    iterations = iterationRows.map(convertRow2Iteration).filter((it) => it !== null) as Iteration[]
    if (iterations.length < iterationRows.length) {
      console.log(`- Итераций найдено: ${iterations.length}. Но обработано больше рядов: ${iterationRows.length}❗`)
    } else {
      console.log(`- Итераций найдено: ${iterations.length}.`)
    }
  }

  console.log()

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
