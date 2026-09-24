// Разовые Node-скрипты с параметрами в коде: разработчик раскомментирует нужный вызов в main().
// Не входят в CLI (src/cli) и по умолчанию ничего не запускают. Решение о каждой функции —
// в Command catalog.

import { NotionApi, NotionAuth } from './apis/NotionApi.js'
import { PartnerApi } from './apis/PartnerApi.js'
import { PartnerUrlProvider } from './apis/PartnerUrlProvider.js'
import { ItsApiV2 } from './apis/ItsApiV2.js'
import { TeamProjectApiV2 } from './apis/TeamProjectApiV2.js'
import { TeamProjectUrlProvider } from './apis/TeamProjectUrlProvider.js'
import { TableTaskReader, TableTaskWriter } from './tasks/TableTask.js'
import { NodeGoogleApi } from './apis/NodeGoogleApi.js'
import { NodeGoogleAuth } from './apis/NodeGoogleAuth.js'
import { DistributeStudentsIntoTeamsTaskExecutor } from './tasks/DistributeStudentsIntoTeamsTask.js'
import { BrsApi, TechnologyCard, TermType } from './apis/BrsApi.js'
import { fillTechnologyCardAsync } from './actions/fillTechnologyCardAsync.js'
import { CreateTeamProjectIterationsTaskExecutor } from './tasks/CreateTeamProjectIterationsTask.js'
import { ExportTechnologyCardsTaskExecutor } from './tasks/ExportTechnologyCardsTask.js'
import { CreateTechnologyCardsTaskExecutor } from './tasks/CreateTechnologyCardsTask.js'
import { SendCuratorMarksTaskExecutor } from './tasks/SendCuratorMarksTask.js'
import { TaskReporter } from './tasks/TaskReporter.js'
import { BrsUrlProvider } from './apis/BrsUrlProvider.js'
import { ItsUrlProvider } from './apis/ItsUrlProvider.js'
import { CredentialsError, NodeCredentials } from './apis/NodeCredentials.js'

const credentials = NodeCredentials.fromProcess()

main().catch((error) => {
  if (error instanceof CredentialsError) {
    console.error(error.message)
    process.exitCode = 1
    return
  }
  throw error
})

async function main() {
  //await distributeStudentsIntoTeamsAsync()
  //await createTeamProjectIterationsAsync()
  //await exportTechnologyCardsAsync()
  //await createTechnologyCardsAsync()
  //await sendCuratorMarksAsync()
}

async function fillTechnologyCards() {
  const urlProvider = new BrsUrlProvider(false)
  const auth = credentials.brsAuth()
  const brsApi = new BrsApi(auth, urlProvider)

  const allCards: Array<TechnologyCard> = [
    //...(await brsApi.getTechnologyCardsAsync(2023, TermType.Spring, 1, false)),
    //...(await brsApi.getTechnologyCardsAsync(2023, TermType.Spring, 2, false)),
    //...(await brsApi.getTechnologyCardsAsync(2023, TermType.Spring, 3, false)),
    //...(await brsApi.getTechnologyCardsAsync(2023, TermType.Spring, 4, false)),
  ]

  const ignoredDisciplines = [
    'Математический анализ',
    'Алгебра и геометрия',
    'Математическая статистика',
    'Алгоритмы и структуры данных',
    'Производственная практика',
    'Учебная практика',
    'Физическая культура',
    'Прикладная физическая культура',
    'Подготовка к защите и процедура защиты выпускной квалификационной работы',
    'Подготовка к сдаче и сдача государственного экзамена',
    'Русский язык как иностранный',
    'История',
    'Философия',
  ]

  const cards = allCards
    .filter((c) => new RegExp('(МЕН-..0801)|(МЕН-..0802)|(МЕН-..0809)|(МЕН-..0810)').test(c.group))
    .filter((c) => !ignoredDisciplines.reduce((result, it) => result || c.discipline.startsWith(it), false))

  console.log(cards.map((card) => `"${card.discipline}" для групп "${card.group}" ${card.isModule ? 'из ИТС' : ''}`))

  const save = false
  for (const card of cards) {
    await fillTechnologyCardAsync(brsApi, card, false, save, TaskReporter.console())
  }
}

async function createTeamProjectIterationsAsync() {
  const googleAuth = await NodeGoogleAuth.createAsync('ask')
  const taskReader = new TableTaskReader(new NodeGoogleApi(googleAuth))
  const task = await taskReader.readTaskBySheetNameAsync('1oJcZnb909lF2VCyPgxacBIbTqMvNlmLKKY-ZHOpTxWI', 'Создание итераций')
  if (task === null) return

  const teamProjectApi = new TeamProjectApiV2(credentials.teamProjectAuth(), new TeamProjectUrlProvider(false))
  const executor = new CreateTeamProjectIterationsTaskExecutor(teamProjectApi, null)
  await executor.executeAsync(task)
}

async function distributeStudentsIntoTeamsAsync() {
  const googleAuth = await NodeGoogleAuth.createAsync('ask-if-not-saved')
  const taskReader = new TableTaskReader(new NodeGoogleApi(googleAuth))
  // const task = await taskReader.readTaskBySheetNameAsync('1F56jrKpF5NGpZccI2rIgByj8QAIaRASDOWxnslEtJ3k', 'Регистрация команд')
  // const task = await taskReader.readTaskBySheetNameAsync('1aLlE3N0twr8b3bbvEFf5ldAPxw5ICU8rrimejCZ2QTU', 'Все студенты')
  // const task = await taskReader.readTaskBySheetNameAsync('1sl6Yo4Hlz7rsVyJZUhCMMf_8xhFJUbcTJvB_NnIvP2M', 'Регистрация команд') // 3 курс
  // const task = await taskReader.readTaskBySheetNameAsync('1YnLMVnnHnb6fVw4baGMOcVf8sKmk580P3Oq3UIN1ttQ', 'Регистрация команд') // 2 курс
  const task = await taskReader.readTaskBySheetNameAsync('1oJcZnb909lF2VCyPgxacBIbTqMvNlmLKKY-ZHOpTxWI', 'Регистрация команд') // 1 курс
  if (task === null) return

  const itsApi = new ItsApiV2(credentials.itsAuth(), new ItsUrlProvider(false))
  const executor = new DistributeStudentsIntoTeamsTaskExecutor(itsApi, null)
  await executor.executeAsync(task)
}

async function sendCuratorMarksAsync() {
  const googleAuth = await NodeGoogleAuth.createAsync('ask-if-not-saved')
  const taskReader = new TableTaskReader(new NodeGoogleApi(googleAuth))

  //Проектный практикум курс 3-4
  const task = await taskReader.readTaskBySheetNameAsync('19C8YE8KT61C8VuFt-WpcN2bh9NNgnTy--fRDKvE8470', 'Участники')

  //Проектный практикум курс 2
  //const task = await taskReader.readTaskBySheetNameAsync('1QgjRk0MqpHmR3sBJ65lzptGtpsdlLETLCPCAdggOW6w', 'Оценивание команд')

  //Проектный практикум курс 1
  //const task = await taskReader.readTaskBySheetNameAsync('1quWHq3S93L-aYKvBbo0t6R7yjxYMz-iCimL2FAerHtA', 'Участники')



  if (task === null) return

  const teamProjectApi = new TeamProjectApiV2(credentials.teamProjectAuth(), new TeamProjectUrlProvider(false))
  const executor = new SendCuratorMarksTaskExecutor(teamProjectApi, null)
  await executor.executeAsync(task)
}

async function createTechnologyCardsAsync() {
  const spreadsheetId = '1itQ1trUjQ9yx6c8FOHzbOc9kSDO-w55ZfMIsGCz9kpE'
  const sheetName = 'Создание техкарт курсов по выбору'
  //const sheetName = 'Создание техкарт основных курсов'

  const googleAuth = await NodeGoogleAuth.createAsync('ask-if-not-saved')
  const googleApi = new NodeGoogleApi(googleAuth)
  const taskReader = new TableTaskReader(googleApi)
  const task = await taskReader.readTaskBySheetNameAsync(spreadsheetId, sheetName)
  if (task === null) return

  const urlProvider = new BrsUrlProvider(false)
  const auth = credentials.brsAuth()
  const brsApi = new BrsApi(auth, urlProvider)

  const executor = new CreateTechnologyCardsTaskExecutor(brsApi, null)
  await executor.executeAsync(task)
}

async function exportTechnologyCardsAsync() {
  const spreadsheetId = '1itQ1trUjQ9yx6c8FOHzbOc9kSDO-w55ZfMIsGCz9kpE'
  // const sheetName = 'Основные курсы'
  const sheetName = 'Курсы по выбору'

  const googleAuth = await NodeGoogleAuth.createAsync('ask-if-not-saved')
  const googleApi = new NodeGoogleApi(googleAuth)
  const taskReader = new TableTaskReader(googleApi)
  const taskWriter = new TableTaskWriter(googleApi)
  const task = await taskReader.readTaskBySheetNameAsync(spreadsheetId, sheetName)
  if (task === null) return

  const urlProvider = new BrsUrlProvider(false)
  const auth = credentials.brsAuth()
  const brsApi = new BrsApi(auth, urlProvider)

  const executor = new ExportTechnologyCardsTaskExecutor(brsApi, taskWriter, null)
  await executor.executeAsync(task)
}

async function cloneProjects() {
  const notionApi = new NotionApi(new NotionAuth())
  const partnerApi = new PartnerApi(credentials.partnerAuth(), new PartnerUrlProvider(false))

  const projectUrls: Array<string> = [
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7823',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7824',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7130',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7129',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7131',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7128',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7127',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7773',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7112',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7111',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7110',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7822',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7090',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7373',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7777',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7956',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7841',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7836',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7835',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7838',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7839',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7840',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7246',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7797',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7800',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7040',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7817',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7093',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7094',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7081',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7082',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7083',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7084',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7790',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7791',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7819',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7821',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7471',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7470',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7039',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7538',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7535',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7842',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7857',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7856',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7844',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/7770',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/8090',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/8091',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/8092',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/8124',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/8142'
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/8321',
    // 'https://partner.urfu.ru/ptraining/services/learning/#/passport/9268',
  ]

  const databaseId = 'fb0e51d76fa14145a48a797b02b6138b'
  const seasonId = '2309'
  for (const projectUrl of projectUrls) {
    const id = parseInt(projectUrl.split('/passport/')[1])
    await addProjectAsync(databaseId, seasonId, id)
  }

  async function addProjectAsync(databaseId: string, season: string, projectId: number) {
    const project = await partnerApi.getProjectAsync(projectId)
    if (!project) {
      console.log(`! No project ${projectId}!`)
      return
    }

    // console.log(project)
    const programProject = project.programs.filter((p) => p.program.name === 'Разработка программных продуктов')[0]
    if (!programProject) {
      console.log(`! No project for program ${projectId}!`)
      return
    }

    console.log(`>> Processing ${projectId}`)
    const id = project.id
    const url = `https://partner.urfu.ru/ptraining/services/learning/#/passport/${project.id}`
    const title = `P${season}-${id} ${project.name}`
    console.log(`>> ${title}`)

    const partnerName = !project.partner.default ? project.partner.short_name ?? project.partner.name : '<По умолчанию>'
    const managerName = [project.manager.last_name, project.manager.first_name].join(' ')
    const goal = project.goal
    const result = project.result
    const criteria = project.criteria
    const description = project.description
    const workType = programProject.work_type
    // const difficultyType = programProject.difficulty_type
    const maxCopies = programProject.max_copies
    const maxTeamSize = programProject.students
    const competentionRoles = programProject.compet_roles
    // const competences = programProject.professional_competence_group_text

    const htmlContent = `
  <h1>Контактные данные</h1>
  <p>${managerName}, заказчик</p>
  <h1>Цель</h1>
  ${goal}
  <h1>Результат (продукт)</h1>
  ${result}
  <h1>Критерии приемки результата / продукта</h1>
  ${criteria}
  <h1>Описание проекта</h1>
  ${description}
  <h1>Количество команд и студентов</h1>
    <p>Максимальное количество команд: ${maxCopies}</p>
    <p>Максимальное количество студентов в команде: ${maxTeamSize}</p>
  <h1>Требования к ролям</h1>
  ${competentionRoles.map((r) => `<h3>${r.role.name} x ${r.quantity}</h3>${r.description}`).join('')}
  `

    const engineType = '⚙инженерный'
    const scienceType = '🔬исследовательский'
    // const entrepreneurType = '💸предпринимательский'
    await notionApi.addHtmlPageAsync(
      databaseId,
      { type: 'emoji', emoji: '🚀' },
      title,
      {
        Статус: {
          select: { name: 'Заявка' },
        },
        'Тип проекта': {
          select: { name: workType === 'DSCV' ? scienceType : engineType },
        },
        'Максимум команд': {
          number: maxCopies,
        },
        Партнер: {
          rich_text: [
            {
              text: {
                content: partnerName,
              },
            },
          ],
        },
        'Внешний адрес': {
          url: url,
        },
      },
      htmlContent,
    )
  }
}
