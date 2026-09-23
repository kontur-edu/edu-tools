import { BrsApi } from "../apis/BrsApi"
import { ItsApiV2 } from "../apis/ItsApiV2"
import { PartnerApi } from "../apis/PartnerApi"
import { TeamProjectApiV2 } from "../apis/TeamProjectApiV2"
import { DistributeStudentsIntoTeamsTaskExecutor } from "./DistributeStudentsIntoTeamsTask"
import { SendCuratorMarksTaskExecutor } from "./SendCuratorMarksTask"
import { ExportTechnologyCardsTaskExecutor } from "./ExportTechnologyCardsTask"
import { CreateTeamProjectIterationsTaskExecutor } from "./CreateTeamProjectIterationsTask"
import { CreateTechnologyCardsTaskExecutor } from "./CreateTechnologyCardsTask"
import { TableTask, TableTaskWriter } from "./TableTask"
import { TaskReporter } from "./TaskReporter"

class TaskExecutionError extends Error {
  constructor(message: string) {
    super(message)
  }
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
    reporter: TaskReporter | null
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
      switch (tableTask.name.toLowerCase()) {
        case SendCuratorMarksTaskExecutor.TASK_NAME.toLowerCase():
          const sendCuratorMarksTaskExecutor = new SendCuratorMarksTaskExecutor(
            this.ensureTeamProjectApi(),
            this.reporter)
          return sendCuratorMarksTaskExecutor.executeAsync(tableTask, forceSave)
        case DistributeStudentsIntoTeamsTaskExecutor.TASK_NAME.toLowerCase():
          const distributeStudentsIntoTeamsTaskExecutor = new DistributeStudentsIntoTeamsTaskExecutor(
            this.ensureItsApi(),
            this.reporter)
          return distributeStudentsIntoTeamsTaskExecutor.executeAsync(tableTask, forceSave)
        case ExportTechnologyCardsTaskExecutor.TASK_NAME.toLowerCase():
          const exportTechnologyCardsTaskExecutor = new ExportTechnologyCardsTaskExecutor(
            this.ensureBrsApi(),
            this.tableTaskWriter,
            this.reporter)
          return exportTechnologyCardsTaskExecutor.executeAsync(tableTask, forceSave)
        case CreateTeamProjectIterationsTaskExecutor.TASK_NAME.toLowerCase():
          const createTeamProjectIterationsTaskExecutor = new CreateTeamProjectIterationsTaskExecutor(
            this.ensureTeamProjectApi(),
            this.reporter)
          return createTeamProjectIterationsTaskExecutor.executeAsync(tableTask, forceSave)
        case CreateTechnologyCardsTaskExecutor.TASK_NAME.toLowerCase():
          const createTechnologyCardsTaskExecutor = new CreateTechnologyCardsTaskExecutor(
            this.ensureBrsApi(),
            this.reporter)
          return createTechnologyCardsTaskExecutor.executeAsync(tableTask, forceSave)
        default:
          throw new TaskExecutionError(`Unknown task "${tableTask.name}"`)
      }
    } catch (error) {
      if (error instanceof TaskExecutionError) {
        this.reporter.error(tableTask.name, error.message, { stopped: true })
      } else {
        console.error(error)
        throw error
      }
    }
  }

  private ensureBrsApi(): BrsApi {
    const brsApi = this.getBrsApi()
    if (!brsApi) {
      throw new TaskExecutionError(`BRS API is not available`)
    }
    return brsApi
  }

  private ensureItsApi(): ItsApiV2 {
    const itsApi = this.getItsApi()
    if (!itsApi) {
      throw new TaskExecutionError(`ITS API is not available`)
    }
    return itsApi
  }

  private ensurePartnerApi(): PartnerApi {
    const partnerApi = this.getPartnerApi()
    if (!partnerApi) {
      throw new TaskExecutionError(`Partner API is not available`)
    }
    return partnerApi
  }

  private ensureTeamProjectApi(): TeamProjectApiV2 {
    const teamProjectApi = this.getTeamProjectApi()
    if (!teamProjectApi) {
      throw new TaskExecutionError(`TeamProject API is not available`)
    }
    return teamProjectApi
  }
}
