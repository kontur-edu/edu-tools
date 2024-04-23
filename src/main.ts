import { NotionApi, NotionAuth } from './apis/NotionApi.js'
import { PartnerApi, PartnerAuth } from './apis/PartnerApi.js'
import { ItsApiV2, ItsAuthV2 } from './apis/ItsApiV2.js'
import { TeamProjectApiV2, TeamProjectAuthV2, IterationItem, Workspace } from './apis/TeamProjectApiV2.js'
import { TableTaskReader, TableTaskWriter } from './tasks/TableTask.js'
import { GoogleApi } from './apis/GoogleApi.js'
import { GoogleAuth } from './apis/GoogleAuth.js'
import { DistributeStudentsIntoTeamsTaskExecutor } from './tasks/DistributeStudentsIntoTeamsTask.js'
import { BrsApi, TechnologyCard, TermType } from './apis/BrsApi.js'
import { BrsAuth } from './apis/BrsAuth.js'
import { fillTechnologyCardAsync } from './actions/fillTechnologyCardAsync.js'
import { CreateTeamProjectIterationsTaskExecutor } from './tasks/CreateTeamProjectIterationsTask.js'
import { ExportTechnologyCardsTaskExecutor } from './tasks/ExportTechnologyCardsTask.js'
import { CreateTechnologyCardsTaskExecutor } from './tasks/CreateTechnologyCardsTask.js'
import { SendCuratorMarksTaskExecutor } from './tasks/SendCuratorMarksTask.js'

console.log('Hello')

main()

async function main() {
  //await runTeamProject34CreateIterations()
  //await distributeStudentsIntoTeams()
  //await createTeamProjectIterationsAsync()
  //await exportTechnologyCardsAsync()
  //await createTechnologyCardsAsync()
  //await sendCuratorMarksAsync()
}

async function fillTechnologyCards() {
  const auth = await BrsAuth.createByConfigAsync('domashnikh')
  if (auth === null) {
    console.log('incorrect auth')
    return
  }
  const brsApi = new BrsApi(auth)

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
    await fillTechnologyCardAsync(brsApi, card, save)
  }
}

async function createTeamProjectIterationsAsync() {
  const googleAuth = await GoogleAuth.createAsync('ask-if-not-saved')
  const taskReader = new TableTaskReader(new GoogleApi(googleAuth))
  const task = await taskReader.readTaskAsync('1Bj34VK2pe2KgfCQd3W00HaoswJPX6QqHGByVQHAacjM', 'Итерации')
  if (task === null) return

  const authJwt = 'Bearer '
  const teamProjectApi = new TeamProjectApiV2(new TeamProjectAuthV2(authJwt))
  const executor = new CreateTeamProjectIterationsTaskExecutor(teamProjectApi)
  await executor.executeAsync(task)
}

async function distributeStudentsIntoTeamsAsync() {
  const googleAuth = await GoogleAuth.createAsync('ask-if-not-saved')
  const taskReader = new TableTaskReader(new GoogleApi(googleAuth))
  const task = await taskReader.readTaskAsync('1Bj34VK2pe2KgfCQd3W00HaoswJPX6QqHGByVQHAacjM', 'Анализ')
  if (task === null) return

  const sessionInfo = ''
  const itsAuth = ''
  const itsApi = new ItsApiV2(new ItsAuthV2(sessionInfo, itsAuth))
  const executor = new DistributeStudentsIntoTeamsTaskExecutor(itsApi)
  await executor.executeAsync(task)
}

async function sendCuratorMarksAsync() {
  const googleAuth = await GoogleAuth.createAsync('ask-if-not-saved')
  const taskReader = new TableTaskReader(new GoogleApi(googleAuth))
  const task = await taskReader.readTaskAsync('1w-GLSYP7y15Y3IsbjYmK0ytc8kc4QbyunZNcUT2IGOU', 'Участники')
  if (task === null) return

  const authJwt = 'Bearer ...'
  const teamProjectApi = new TeamProjectApiV2(new TeamProjectAuthV2(authJwt))
  const executor = new SendCuratorMarksTaskExecutor(teamProjectApi)
  await executor.executeAsync(task)
}

async function createTechnologyCardsAsync() {
  const spreadsheetId = '1JU9IPwk5JMHBfe7RNcNtut8FvaavfOsGyN7V0AbFMCQ'
  const sheetName = 'Выбранные'

  const googleAuth = await GoogleAuth.createAsync('ask-if-not-saved')
  const googleApi = new GoogleApi(googleAuth)
  const taskReader = new TableTaskReader(googleApi)
  const task = await taskReader.readTaskAsync(spreadsheetId, sheetName)
  if (task === null) return

  const auth = await BrsAuth.createByConfigAsync('domashnikh')
  if (auth === null) {
    console.log('incorrect auth')
    return
  }
  const brsApi = new BrsApi(auth)

  const executor = new CreateTechnologyCardsTaskExecutor(brsApi)
  await executor.executeAsync(task)
}

async function exportTechnologyCardsAsync() {
  const spreadsheetId = '1JU9IPwk5JMHBfe7RNcNtut8FvaavfOsGyN7V0AbFMCQ'
  const sheetName = 'Дисциплины'

  const googleAuth = await GoogleAuth.createAsync('ask-if-not-saved')
  const googleApi = new GoogleApi(googleAuth)
  const taskReader = new TableTaskReader(googleApi)
  const taskWriter = new TableTaskWriter(googleApi, spreadsheetId, sheetName)
  const task = await taskReader.readTaskAsync(spreadsheetId, sheetName)
  if (task === null) return

  const auth = await BrsAuth.createByConfigAsync('domashnikh')
  if (auth === null) {
    console.log('incorrect auth')
    return
  }
  const brsApi = new BrsApi(auth)

  const executor = new ExportTechnologyCardsTaskExecutor(brsApi, taskWriter)
  await executor.executeAsync(task)
}

async function cloneProjects() {
  const notionApi = new NotionApi(new NotionAuth())
  const partnerApi = new PartnerApi(new PartnerAuth(''))

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
