import { NotionApi, NotionAuth } from './apis/NotionApi.js'
import { PartnerApi, PartnerAuth } from './apis/PartnerApi.js'
import { TeamProjectApiV2, TeamProjectAuthV2, IterationItem, Workspace } from './apis/TeamProjectApiV2.js'
import JustDate from './helpers/JustDate.js'

console.log('Hello')

main()

async function main() {
  // await runTeamProject34CreateIterations()
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

async function runTeamProject34CreateIterations() {
  const save = false

  const it3start = new JustDate(2023, 10, 30)
  const it3end = new JustDate(2023, 11, 12)
  const it4start = new JustDate(2023, 11, 13)
  const it4end = new JustDate(2023, 11, 26)
  const it5start = new JustDate(2023, 11, 27)
  const it5end = new JustDate(2023, 12, 10)
  const it6start = new JustDate(2023, 12, 11)
  const it6end = new JustDate(2023, 12, 24)

  const authJwt = 'Bearer ...'
  const auth = new TeamProjectAuthV2(authJwt)
  const teamProjectApi = new TeamProjectApiV2(auth)

  const projects = (await teamProjectApi.getWorkspacesAsync('active', 2023, 1, 1, 100)).items
  const filteredProjects = projects.filter(
    (it) =>
      !it.title.startsWith('Веб-приложение') &&
      !it.title.startsWith('Новый продукт') &&
      !it.title.startsWith('Используемое приложение'),
  )

  for (const project of filteredProjects) {
    console.log('# Проект', project.title, project.instanceNumber)

    const iterations = await teamProjectApi.getIterationsAsync(project.id)

    if (iterations.length === 0) {
      console.log('Добавление итераций...')
      if (save) {
        const r3 = await teamProjectApi.postIterationAsync(project.id, 'Спринт 3', '', it3start, it3end)
        console.log(r3)

        const r4 = await teamProjectApi.postIterationAsync(project.id, 'Спринт 4', '', it4start, it4end)
        console.log(r4)

        const r5 = await teamProjectApi.postIterationAsync(project.id, 'Спринт 5', '', it5start, it5end)
        console.log(r5)

        const r6 = await teamProjectApi.postIterationAsync(project.id, 'Спринт 6', '', it6start, it6end)
        console.log(r6)
      }
    } else {
      console.log('Итерации проекта:')
      for (const iteration of iterations) {
        console.log('- ', iteration.title)

        await tryUpdateIteration(teamProjectApi, iteration, 'Спринт 3', it3start, it3end, project, save)
        await tryUpdateIteration(teamProjectApi, iteration, 'Спринт 4', it4start, it4end, project, save)
        await tryUpdateIteration(teamProjectApi, iteration, 'Спринт 5', it5start, it5end, project, save)
        await tryUpdateIteration(teamProjectApi, iteration, 'Спринт 6', it6start, it6end, project, save)
      }
    }

    console.log()
  }
}

async function tryUpdateIteration(
  teamProjectApi: TeamProjectApiV2,
  iterationItem: IterationItem,
  iterationName: string,
  startDate: JustDate,
  endDate: JustDate,
  project: Workspace,
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
      console.log('  Обновление... ', iterationItem.title)
      if (save) {
        const response = await teamProjectApi.putIterationAsync(
          iteration.id,
          iteration.title,
          iteration.description,
          startDate,
          endDate,
        )
        console.log(response)
        console.log('  обновлено: ', iterationItem.title, beginning, ending)
      }
    }
  }
}
