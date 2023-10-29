import { NotionApi, NotionAuth } from './apis/NotionApi.js'
import { PartnerApi, PartnerAuth } from './apis/PartnerApi.js'
import { TeamProjectApiV2, TeamProjectAuthV2, IterationItem, Workspace } from './apis/TeamProjectApiV2.js'
import JustDate from './helpers/JustDate.js'

console.log('Hello')

const notionApi = new NotionApi(new NotionAuth())
const partnerApi = new PartnerApi(
  new PartnerAuth(
    '',
  ),
)

const projectUrls = [
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7823',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7824',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7130',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7129',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7131',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7128',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7127',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7773',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7112',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7111',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7110',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7822',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7090',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7373',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7777',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7956',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7841',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7836',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7835',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7838',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7839',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7840',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7246',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7797',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7800',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7040',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7817',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7093',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7094',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7081',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7082',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7083',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7084',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7790',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7791',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7819',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7821',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7471',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7470',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7039',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7538',
  'https://partner.urfu.ru/ptraining/services/learning/#/passport/7535',
  //'https://partner.urfu.ru/ptraining/services/learning/#/passport/7842',
  //'https://partner.urfu.ru/ptraining/services/learning/#/passport/7857',
  //'https://partner.urfu.ru/ptraining/services/learning/#/passport/7856',
  //'https://partner.urfu.ru/ptraining/services/learning/#/passport/7844',
  //'https://partner.urfu.ru/ptraining/services/learning/#/passport/7770',
]

const databaseId = 'fb0e51d76fa14145a48a797b02b6138b'
const seasonId = '2309'
for (const projectUrl of projectUrls) {
  const id = parseInt(projectUrl.split('/passport/')[1])
  await addProjectAsync(databaseId, seasonId, id)
}

await addProjectAsync(databaseId, seasonId, 7084)

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
  await notionApi.addProjectAsync(
    databaseId,
    '🚀',
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
