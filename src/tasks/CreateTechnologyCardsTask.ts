import { BrsApi, TechnologyCard } from '../apis/BrsApi'
import { TableTask, TableTaskValue } from './TableTask'
import { ConsoleTableTaskLogger, TableTaskLogger } from './TableTaskLogger'
import { fillTechnologyCardAsync } from '../actions/fillTechnologyCardAsync'

export class CreateTechnologyCardsTaskExecutor {
  static readonly TASK_NAME = 'CreateTechnologyCards'
  
  brsApi: BrsApi
  tableTaskLogger: TableTaskLogger

  constructor(brsApi: BrsApi, tableTaskLogger: TableTaskLogger | null) {
    this.brsApi = brsApi
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

    const technologyCards: { [disciplineLoad: string]: TechnologyCard } = {}

    for (const discipline of task.disciplines) {
      let technologyCard = technologyCards[discipline.disciplineLoad]
      if (technologyCard === undefined) {
        const cards = await this.brsApi.getTechnologyCardsAsync(
          discipline.academicYear,
          discipline.semester,
          discipline.studyYear,
          discipline.isModule,
        )
        for (const card of cards) {
          technologyCards[card.disciplineLoad] = card
        }

        technologyCard = technologyCards[discipline.disciplineLoad]

        if (technologyCard === undefined) {
          this.tableTaskLogger.log(
            `🚩 Обработка техкарты "${discipline.disciplineLoad}" по предмету "${discipline.discipline}" ${
              discipline.isModule ? 'из ИТС' : ''
            }`,
          )
          this.tableTaskLogger.log('❌ Техкарта не найдена!')
          this.tableTaskLogger.log()
          continue
        }
      }
      const agree = discipline.agreed
      await fillTechnologyCardAsync(this.brsApi, technologyCard, agree, task.save)
    }

    this.tableTaskLogger.log(`✅ Execution has been completed`)
    this.tableTaskLogger.log()
  }
}

function extractTask(tableTask: TableTask, tableTaskLogger: TableTaskLogger, forceSave: boolean | null = null): CreateTechnologyCardsTask | null {
  let save = tableTask.getParam('save').getBool() || false
  if (forceSave !== null) {
    save = forceSave
  }
  tableTaskLogger.log(save ? `- save mode on ⚡` : `- save mode off`)

  const disciplines = tableTask.rows.map(convertRow2Discipline).filter((it) => it !== null) as Discipline[]
  if (disciplines.length < tableTask.rows.length) {
    tableTaskLogger.log(`- ${disciplines.length} disciplines was found in ${tableTask.rows.length} rows❗`)
  } else {
    tableTaskLogger.log(`- ${disciplines.length} disciplines was found.`)
  }

  tableTaskLogger.log()

  return {
    name: tableTask.name,
    save,
    disciplines,
  }
}

function convertRow2Discipline(row: { [key: string]: string }): Discipline | null {
  const disciplineLoad = TableTaskValue.extract(row, 'disciplineLoad').getString()
  const discipline = TableTaskValue.extract(row, 'discipline').getString()
  const isModule = TableTaskValue.extract(row, 'ismodule').getBool()

  const academicYear = TableTaskValue.extract(row, 'academicyear').getInt()
  const studyYear = TableTaskValue.extract(row, 'studyYear').getInt()
  const semester = TableTaskValue.extract(row, 'semester').getInt()
  const agreed = TableTaskValue.extract(row, 'agreed').getBool()

  if (
    disciplineLoad !== null &&
    discipline !== null &&
    isModule !== null &&
    academicYear !== null &&
    studyYear !== null &&
    semester !== null &&
    agreed !== null
  ) {
    return {
      disciplineLoad,
      discipline,
      isModule,
      academicYear,
      studyYear,
      semester,
      agreed,
    }
  }
  return null
}

interface CreateTechnologyCardsTask {
  name: string
  save: boolean
  disciplines: Array<Discipline>
}

interface Discipline {
  disciplineLoad: string
  discipline: string
  isModule: boolean
  academicYear: number
  studyYear: number
  semester: number
  agreed: boolean
}
