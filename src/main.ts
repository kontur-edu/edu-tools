import { NotionApi, NotionAuth } from './apis/NotionApi.js'
import { PartnerApi, PartnerAuth } from './apis/PartnerApi.js'
import { ItsApiV2, ItsAuthV2 } from './apis/ItsApiV2.js'
import { TeamProjectApiV2, TeamProjectAuthV2, IterationItem, Workspace } from './apis/TeamProjectApiV2.js'
import JustDate from './helpers/JustDate.js'
import { TableTaskReader } from './tasks/TableTask.js'
import { GoogleApi } from './apis/GoogleApi.js'
import { GoogleAuth } from './apis/GoogleAuth.js'
import { DistributeStudentsIntoTeamsTaskExecutor } from './tasks/DistributeStudentsIntoTeamsTask.js'

console.log('Hello')

main()

async function main() {

async function distributeStudentsIntoTeams() {
  const googleAuth = await GoogleAuth.createAsync('ask-if-not-saved')
  const taskReader = new TableTaskReader(new GoogleApi(googleAuth))
  const task = await taskReader.readTaskAsync('1Bj34VK2pe2KgfCQd3W00HaoswJPX6QqHGByVQHAacjM', 'Анализ')
  if (task === null) return

  const sessionInfo = '418bb95e-9f1c-490f-976e-f5fa7f79a2aa'
  const itsAuth =
    'CfDJ8GAoiQgb1d9Imo_HF0-rrwErjkY3nG7z089LYIqHH1f2CuJ4eqV6ZmiaqHK6hZV9HVIst39NU77SMebwYiflC8mfnp1GXYJcNBpxCNghCZVtcUhQMbE2mIOgC372t5ZF_f0CDRWyWzh2xfCYzUlj_iVSK_Z-njlsYNdyLyTtiWZ3VGjq4OSAywV12xnARfImheHV7MBAua0sArBHoNtFhfDnBG04vsbKap-CCyVaPBnHTtsnR30B0WN3b72ojQEJ4t2e9OVOadF2o7W-_sfEQEQkrNME7WDAD1UFHyBgyRpcTyc5imb1mLj3tirWvmxmTADvgXir5viSbtNbekLJQAiFK3Uim756mKL47yPGB4VdFwLMZIG9y7SWVSdcuLhyTbCmDCPh4xNnM5bJUSKZIwCjj__xWn_EnWsgHGRDNWedbjwER8HGczUqFoOnqoANdRqbqSAMeH5cgtOIfR5MvC5ljOPTZEk3ShfPUo6xesIghrc6hSAwy04T_-3DWES9kcGnGWSOoU4vFWBFtSAoxE1mdV-2Ri_7DgOAprMbNmZPo3CZX3xjNHln1lhiBH_X1zJQpuNBymPqTn7taRcBZbdSXQVX3n-n_hA0vRYT2l5O_zdwY6BNRdYbyhgkIkVXCdUqMvQ5AeHEZxtvNYlxvoL4sP23JrrTWKhMw4y1sMyqlxGlgZjEM9GI-0x2htcBakqZHY6_CbRo0quTlXz1snQY3EUJvPjagcv8usXtZpUq5dYKJJzz6CW50D3pwweAwk9Degn4H4-In4TaSgWaMlpF1fayMOVEuKuv1nd2-7jWQ7Ghnl7zpSoWWJqDSn1WPkYQ9RL4dJbyhzvlYCBDPVBdh916mBuXHsEgXxBPmCyTaAP7X0n1jmpmT8L9OGdO2tA7-nun9XBs0DfZyei6oHqwRmUt2ivj6M1oPG4aZhDy_bXz3e8twm9YYZe4n7kJH0Uh-Q4QMheQA9XYuMmd26OPU7GxqBxrJHJcv_Bdg_N11HVThKKkSK_Gt95OKzlDeGchmvo4wXP09xITWtmNjV4OspHW39sxmp8r3ZJ7qYxj425O5m-ESSAPEVP7YRhA7lkmGQ29CCi0MAXLfSj-kdqC9UqiHomMTOTcGQ0cO3tNZFkUvWq-o_OG7M8p8Zjef4-QzJK4UU2ckpqnMlvQVFUnAKO_YOt1xkxBf3VuiM2QxK_EmspHN6Kp5usVgT_XIhwG9G2en3fRnoC6Y00u6W5Litm8DGFZwDmqHgv39fwuLLa7yntOGVXwc8mXTDhAp87snrW12wEsGy0rSA4IUFKa904oNZt82XXE4-esoRanSp2Gey6pbZr4u-ky7RJnW4aFjm3QzlaLWMbUhyw2wgVM-A1HWk-X0bSaT5tmJNVgsmIO5-Sv-tWmfxWaClvQ_9LiumxB0iqw6xxc4IMgexEGI5hWGXDATingmw_a_gA05TH7UqEJTfpAYWHmPfmF61R01KleCqIsSnV73QuINZVbpUpVSUnfcJ7hKJIELHjjqDyq4mykxZbwgs5HPopaCGOD5PV2kSRI24Qsu-BScL_80uEhrdBw_om9NLqnXo24199bhm8erYUy_nYS8RelLB8xuYFy9pFi43UDBETS3WRrhVgJ7zFfqk3xIQpP5sGZdMsVLaaDFlKI7OZwSLQm7OCLg1u8QgZpCgme6xhMVrIVgFy39yVyv2mZMB4_8PTWQLUDz65YfElQCwRDsF4yFX9UH5smF6gWpgUwATkMLc_MmBT6q5COq8pPBnEa6kv67bgVuh_QnRLAVKAxHSS-ghkumXW-WXeKZ0Kx7_cvLsXAQxaJe4pYxxwQho7ZlB8ePIpcYOy5DTKTMaEnclIg1_zrHKjh_gVTO816qNC2pS_ss9lKq_fEO-EwlXeDGFHWKqQXsahYFUNjNVRIoSOH_FWQtyMalRfDN6T0L7F3pE9vXEq0M5D_vXj4MZX9cGeB5IiesgteCgjOyBmbbHHBCZYhqtph_W5jBJlGnnaSvnflb8kmZGf0QjMLvDurEPlmL8gLrLZ5cD01Tz0bEeqBeTmKucm1A_qYzdWfsSE5e-yFQ30dXkCOYJ_K5rzZzoVtWl7u9ULPfw8weqgXg1UsIgGFUV_B-lVBAUcI2o3saImCbqJvH2b1mNdhwidGzTuXWN3KLSbAUTycXCvCkklW7aLQmFClutNelw8u_gMw0vHf7UokbtaXU2rOBVvT88PaFBYkK1LvmOJnKRIsasZFh1Rupp_96ogK6UGhf0uwesIXud1Ku5ECy5SPkeldBttapnn7zeFqH2XrJ7oY64cRfbqzI4DpOK4W2oeXUJeWVI_5GuACwItHWOKR_BpCZzJQm9-z1-_dNqocXaSZUU7d1QpAaM-1ewr1MUgy7pasoyf-9ESJhOAaO1lIGruEM37GDZQ8tE4Rv0q91Bn15ZkJ9cWF_4z03-DPMWYq4_G63GN5rarbG8xWi0z0xoTBrJLEriDXQ7CCL86BWQLxzh9uej9W--OAiaS34k-ZT_wNGZc'
  const itsApi = new ItsApiV2(new ItsAuthV2(sessionInfo, itsAuth))
  const executor = new DistributeStudentsIntoTeamsTaskExecutor(itsApi)
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
