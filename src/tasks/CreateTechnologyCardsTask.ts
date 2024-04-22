import { BrsApi, TechnologyCard } from '../apis/BrsApi.js'
import { TableTask, TableTaskValue } from './TableTask.js'
import { fillTechnologyCardAsync } from '../actions/fillTechnologyCardAsync.js'

export class CreateTechnologyCardsTaskExecutor {
  brsApi: BrsApi

  constructor(brsApi: BrsApi) {
    this.brsApi = brsApi
  }

  async executeAsync(tableTask: TableTask) {
    console.log(`🚩 Executing task "${tableTask.name}"`)

    const task = extractTask(tableTask)
    if (!task) {
      console.log(`❌ Execution has been stopped`)
      console.log()
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
          console.log(
            `🚩 Обработка техкарты "${discipline.disciplineLoad}" по предмету "${discipline.discipline}" ${
              discipline.isModule ? 'из ИТС' : ''
            }`,
          )
          console.log('❌ Техкарта не найдена!')
          console.log()
          continue
        }
      }
      const agree = discipline.agreed
      await fillTechnologyCardAsync(this.brsApi, technologyCard, agree, task.save)
    }

    console.log(`✅ Execution has been completed`)
    console.log()
  }
}

function extractTask(tableTask: TableTask): CreateTechnologyCardsTask | null {
  const save = tableTask.getParam('save').getBool() || false
  console.log(save ? `- save mode on ⚡` : `- save mode off`)

  const disciplines = tableTask.rows.map(convertRow2Discipline).filter((it) => it !== null) as Discipline[]
  if (disciplines.length < tableTask.rows.length) {
    console.log(`- ${disciplines.length} disciplines was found in ${tableTask.rows.length} rows❗`)
  } else {
    console.log(`- ${disciplines.length} disciplines was found.`)
  }

  console.log()

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
