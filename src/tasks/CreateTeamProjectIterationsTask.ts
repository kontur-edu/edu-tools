import { IterationItem, TeamProjectApiV2, Workspace } from '../apis/TeamProjectApiV2.js'
import JustDate from '../helpers/JustDate.js'
import { compareNormalized } from '../helpers/tools.js'
import { TableTask } from './TableTask.js'

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

    const pageSize = 100
    const projects: Workspace[] = []
    let pageNumber = 1
    let total = pageSize
    while ((pageNumber - 1) * pageSize < total) {
      const r = await this.teamProjectApi.getWorkspacesAsync(
        'active',
        task.academicYear,
        task.semester,
        pageNumber,
        pageSize,
      )
      projects.push(...r.items)
      total = r.total
      pageNumber++
    }

    const projectIdSet: {[k: string]: boolean} = {}
    for(const id of task.projectsIds) {
      projectIdSet[id] = true
    }
    const suitableProjects = projects.filter(p => projectIdSet[p.id] )

    for (const project of suitableProjects) {
      console.log('## Проект', project.title, project.instanceNumber)

      const tpIterations = await this.teamProjectApi.getIterationsAsync(project.id)

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

      console.log()
    }

    console.log(`✅ Выполнение задания завершено`)
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
    if (
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
  const academicYear = tableTask.getCustomParam('academicYear', (it) => parseInt(it.split('/')[0], 10))
  if (academicYear === null) {
    console.log('- academicYear необходим❗')
    return null
  }
  console.log(`- academicYear: ${academicYear}`)

  const semester = tableTask.getCustomParam('semester', (it) =>
    compareNormalized(it, 'fall') ? 1 : compareNormalized(it, 'spring') ? 2 : null,
  )
  if (semester === null) {
    console.log('- semester необходим❗')
    return null
  }
  console.log(`- semester: ${semester}`)

  const save = tableTask.getBoolParam('save') || false
  console.log(save ? `- режим save включен ⚡` : `- режим save выключен`)

  const projectIds = tableTask.rows.map(convertRow2ProjectId).filter((it) => it !== null) as string[]

  let iterations: Array<Iteration> = []
  const iterationRows = tableTask.rowsByNamespace['iteration']
  if (iterationRows) {
    iterations = iterationRows
      .map(convertRow2Iteration)
      .filter((it) => it !== null) as Iteration[]
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
    projectsIds: projectIds,
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

function convertRow2ProjectId(row: { [key: string]: string }): string | null {
  if (!row.projecturl) {
    return null
  }
  // https://teamproject.urfu.ru/#/121b28db-3930-410e-81d8-8de42f7a2756/about
  // /#/121b28db-3930-410e-81d8-8de42f7a2756/
  const regexp = new RegExp('#\\/([0-9\\-abcdef]+)\\/')
  const match = row.projecturl.match(regexp)
  return match ? match[1] : null
}

interface CreateTeamProjectIterationsTask {
  name: string
  save: boolean
  academicYear: number
  semester: 1 | 2
  iterations: Array<Iteration>
  projectsIds: Array<string>
}

interface Iteration {
  name: string
  startdate: JustDate
  enddate: JustDate
}
