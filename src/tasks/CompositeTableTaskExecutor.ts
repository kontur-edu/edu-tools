import { BrsApi } from '../apis/BrsApi'
import { ItsApiV2 } from '../apis/ItsApiV2'
import { PartnerApi } from '../apis/PartnerApi'
import { TeamProjectApiV2 } from '../apis/TeamProjectApiV2'
import { DistributeStudentsIntoTeamsTaskExecutor } from './DistributeStudentsIntoTeamsTask'
import { SendCuratorMarksTaskExecutor } from './SendCuratorMarksTask'
import { ExportTechnologyCardsTaskExecutor } from './ExportTechnologyCardsTask'
import { CreateTeamProjectIterationsTaskExecutor } from './CreateTeamProjectIterationsTask'
import { CreateTechnologyCardsTaskExecutor } from './CreateTechnologyCardsTask'
import { PutMarksToBrsTaskExecutor } from './PutMarksToBrsTask'
import { TableTask, TableTaskWriter } from './TableTask'
import { TaskExecutionError } from './TaskExecutionError'
import { TaskReporter } from './TaskReporter'

// Внешние системы, API которых нужны заданиям (Google — отдельно: он нужен источнику, а не заданию).
export type TaskSystem = 'brs' | 'its' | 'teamproject'

// Зависимости, из которых собирается исполнитель задания. Getter API вызывается только для нужной
// заданию системы: может вернуть null (web: нет авторизации) или бросить TaskExecutionError.
interface TaskExecutorDependencies {
  getBrsApi: () => BrsApi
  getItsApi: () => ItsApiV2
  getTeamProjectApi: () => TeamProjectApiV2
  tableTaskWriter: TableTaskWriter
  reporter: TaskReporter
}

export interface TableTaskType {
  name: string
  systems: TaskSystem[]
  // Пишет ли задание результат на лист, из которого прочитано (в режиме save).
  writesToSheet: boolean
  createExecutor(dependencies: TaskExecutorDependencies): {
    executeAsync(tableTask: TableTask, forceSave: boolean | null): Promise<void>
  }
}

// Реестр типов заданий: из него строятся маршрутизация исполнителя и `task list` в CLI.
export const tableTaskTypes: ReadonlyArray<TableTaskType> = [
  {
    name: SendCuratorMarksTaskExecutor.TASK_NAME,
    systems: ['teamproject'],
    writesToSheet: false,
    createExecutor: (d) => new SendCuratorMarksTaskExecutor(d.getTeamProjectApi(), d.reporter),
  },
  {
    name: DistributeStudentsIntoTeamsTaskExecutor.TASK_NAME,
    systems: ['its'],
    writesToSheet: false,
    createExecutor: (d) => new DistributeStudentsIntoTeamsTaskExecutor(d.getItsApi(), d.reporter),
  },
  {
    name: ExportTechnologyCardsTaskExecutor.TASK_NAME,
    systems: ['brs'],
    writesToSheet: true,
    createExecutor: (d) => new ExportTechnologyCardsTaskExecutor(d.getBrsApi(), d.tableTaskWriter, d.reporter),
  },
  {
    name: CreateTeamProjectIterationsTaskExecutor.TASK_NAME,
    systems: ['teamproject'],
    writesToSheet: false,
    createExecutor: (d) => new CreateTeamProjectIterationsTaskExecutor(d.getTeamProjectApi(), d.reporter),
  },
  {
    name: CreateTechnologyCardsTaskExecutor.TASK_NAME,
    systems: ['brs'],
    writesToSheet: false,
    createExecutor: (d) => new CreateTechnologyCardsTaskExecutor(d.getBrsApi(), d.reporter),
  },
  {
    name: PutMarksToBrsTaskExecutor.TASK_NAME,
    systems: ['brs'],
    writesToSheet: false,
    createExecutor: (d) => new PutMarksToBrsTaskExecutor(d.getBrsApi(), d.reporter),
  },
]

export function findTableTaskType(name: string): TableTaskType | null {
  return tableTaskTypes.find((type) => type.name.toLowerCase() === name.toLowerCase()) ?? null
}

export class CompositeTableTaskExecutor {
  getBrsApi: () => BrsApi | null
  getItsApi: () => ItsApiV2 | null
  getPartnerApi: () => PartnerApi | null
  getTeamProjectApi: () => TeamProjectApiV2 | null
  tableTaskWriter: TableTaskWriter
  reporter: TaskReporter

  constructor(
    getBrsApi: () => BrsApi | null,
    getItsApi: () => ItsApiV2 | null,
    getPartnerApi: () => PartnerApi | null,
    getTeamProjectApi: () => TeamProjectApiV2 | null,
    tableTaskWriter: TableTaskWriter,
    reporter: TaskReporter | null,
  ) {
    this.getBrsApi = getBrsApi
    this.getItsApi = getItsApi
    this.getPartnerApi = getPartnerApi
    this.getTeamProjectApi = getTeamProjectApi
    this.tableTaskWriter = tableTaskWriter
    this.reporter = reporter || TaskReporter.console()
  }

  async executeAsync(tableTask: TableTask, forceSave: boolean | null = null) {
    try {
      const taskType = findTableTaskType(tableTask.name)
      if (!taskType) {
        throw new TaskExecutionError(`Unknown task "${tableTask.name}"`)
      }
      const executor = taskType.createExecutor({
        getBrsApi: () => this.ensureApi(this.getBrsApi(), 'BRS'),
        getItsApi: () => this.ensureApi(this.getItsApi(), 'ITS'),
        getTeamProjectApi: () => this.ensureApi(this.getTeamProjectApi(), 'TeamProject'),
        tableTaskWriter: this.tableTaskWriter,
        reporter: this.reporter,
      })
      return await executor.executeAsync(tableTask, forceSave)
    } catch (error) {
      if (error instanceof TaskExecutionError) {
        this.reporter.error(tableTask.name, error.message, { stopped: true, details: error.details })
      } else {
        console.error(error)
        throw error
      }
    }
  }

  private ensureApi<T>(api: T | null, title: string): T {
    if (!api) {
      throw new TaskExecutionError(`${title} API is not available`)
    }
    return api
  }
}
