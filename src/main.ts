import { NotionApi, NotionAuth } from './apis/NotionApi.js'
import { PartnerApi } from './apis/PartnerApi.js'
import { PartnerUrlProvider } from './apis/PartnerUrlProvider.js'
import { PartnerAuth } from './apis/PartnerAuth.js'
import { ItsApiV2 } from './apis/ItsApiV2.js'
import { ItsAuthV2 } from './apis/ItsAuthV2.js'
import { TeamProjectAuthV2 } from './apis/TeamProjectAuthV2.js'
import { TeamProjectApiV2 } from './apis/TeamProjectApiV2.js'
import { TeamProjectUrlProvider } from './apis/TeamProjectUrlProvider.js'
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
import { BrsUrlProvider } from './apis/BrsUrlProvider.js'
import { ItsUrlProvider } from './apis/ItsUrlProvider.js'

console.log('Hello')

main()

async function main() {
  //await distributeStudentsIntoTeamsAsync()
  //await createTeamProjectIterationsAsync()
  //await exportTechnologyCardsAsync()
  //await createTechnologyCardsAsync()
  //await sendCuratorMarksAsync()
}

async function fillTechnologyCards() {
  const urlProvider = new BrsUrlProvider(false)
  const sid = '1234567890'
  const auth = new BrsAuth(sid)
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
    await fillTechnologyCardAsync(brsApi, card, save)
  }
}

async function createTeamProjectIterationsAsync() {
  const googleAuth = await GoogleAuth.createAsync('ask')
  const taskReader = new TableTaskReader(new GoogleApi(googleAuth))
  const task = await taskReader.readTaskAsync('1oJcZnb909lF2VCyPgxacBIbTqMvNlmLKKY-ZHOpTxWI', 'Создание итераций')
  if (task === null) return

  const authJwt = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJmRXFJMlNLVm85X19yXzZMZ1hYZVloaEVSSG5jR19VdEVhNVgxT2VLQk5ZIn0.eyJleHAiOjE3NDQ0MDY5NjYsImlhdCI6MTc0NDM3MDk2NiwiYXV0aF90aW1lIjoxNzQ0MzcwOTY2LCJqdGkiOiJiZDMxYzdmYy1iNTkxLTQxMzctOWUyMi1mZDhiMDQwY2E4ZDIiLCJpc3MiOiJodHRwczovL2tleXMudXJmdS5ydS9hdXRoL3JlYWxtcy91cmZ1LWxrIiwic3ViIjoiZDVkYzUyYTYtYWZkYS00MzNiLTgwZjItMTMwMGY0MDYzODU5IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoidGVhbXBybyIsIm5vbmNlIjoiZDU2NzVlZjgtYTA0YS00ODg0LTk5MTgtZjE2ZjM2MTA2YjlhIiwic2Vzc2lvbl9zdGF0ZSI6IjMzYWQ3ZDljLTc4ZWUtNGE4Yy05MmFmLWU4YzcwM2Q3ZmUyZCIsInNjb3BlIjoib3BlbmlkIGxrLW1hcGVycyIsInNpZCI6IjMzYWQ3ZDljLTc4ZWUtNGE4Yy05MmFmLWU4YzcwM2Q3ZmUyZCIsInVzZXIiOnsicGVyc29uIjp7ImlkIjoiSS5BLkRvbWFzaG5pa2giLCJndWlkIjoiYjY0M2QzOWEtN2I3Yi00OTdiLTg4MTctZTFlNzBiMjA1MWE1IiwidGl0bGUiOiLQlNC-0LzQsNGI0L3QuNGFINCY0LLQsNC9INCQ0LvQtdC60YHQtdC10LLQuNGHIiwibGFzdE5hbWUiOiLQlNC-0LzQsNGI0L3QuNGFIiwiZmlyc3ROYW1lIjoi0JjQstCw0L0iLCJtaWRkbGVOYW1lIjoi0JDQu9C10LrRgdC10LXQstC40YciLCJlbWFpbCI6ImkuYS5kb21hc2huaWtoQHVyZnUucnUifSwicm9sZXMiOlt7InVzZXJUeXBlIjoiRW1wbG95ZWUiLCJpZCI6IjJhNzNkODEzLWEwNTgtMTFlZC05ZGMyLTI0OGEwN2Q3YmZlMSIsImVtcGxveW1lbnRUeXBlIjoi0JLQvdC10YjQvdC10LUg0YHQvtCy0LzQtdGB0YLQuNGC0LXQu9GM0YHRgtCy0L4iLCJwb3N0Ijoi0KHRgtCw0YDRiNC40Lkg0L_RgNC10L_QvtC00LDQstCw0YLQtdC70YwiLCJjYXRlZ29yeSI6ItCf0J_QoSIsInJhdGUiOjAuMjUsImRpdmlzaW9uSWQiOiI1N2E4OTBlNi04NmViLTQ0NTEtYWI2Zi05NDhhZGYxMmIyMjQiLCJkaXZpc2lvblRpdGxlIjoi0JTQtdC_0LDRgNGC0LDQvNC10L3RgiDQvNCw0YLQtdC80LDRgtC40LrQuCwg0LzQtdGF0LDQvdC40LrQuCDQuCDQutC-0LzQv9GM0Y7RgtC10YDQvdGL0YUg0L3QsNGD0LoifV19fQ.mVSI003TFNbEn4BJ4bZKW4o7AcWWE5ZqRpkTkZcQkCLc__JTR6oS8sIwJ1l7MJnYbVtv89s2N6209pw4bvfQn6qSrO8p3xNu897Iw9ib9cmKOnGxOsSpW8fGkrQpuCIlP3vWbEMXyuj_Rq81EMWSmPsKCbQxI5ubYkv4EXJJeDt8pCxUaFmlBGjksQlZ8c8f6U5g9qbJqI5DV-zBNTYkhvOak6iZLUWfnxJADrKWlU4lbl0Ve-arRnqyl86XfJA7iFNkaIIjUjimqt9T4tp7_js1ncbd2QKfRZumgSIFvaV9h28Yp7Vn1ym3H13LtqzYjqJukf46MegMQgQUkIs70A'
  const teamProjectApi = new TeamProjectApiV2(new TeamProjectAuthV2(authJwt), new TeamProjectUrlProvider(false))
  const executor = new CreateTeamProjectIterationsTaskExecutor(teamProjectApi)
  await executor.executeAsync(task)
}

async function distributeStudentsIntoTeamsAsync() {
  const googleAuth = await GoogleAuth.createAsync('ask-if-not-saved')
  const taskReader = new TableTaskReader(new GoogleApi(googleAuth))
  // const task = await taskReader.readTaskAsync('1F56jrKpF5NGpZccI2rIgByj8QAIaRASDOWxnslEtJ3k', 'Регистрация команд')
  // const task = await taskReader.readTaskAsync('1aLlE3N0twr8b3bbvEFf5ldAPxw5ICU8rrimejCZ2QTU', 'Все студенты')
  // const task = await taskReader.readTaskAsync('1sl6Yo4Hlz7rsVyJZUhCMMf_8xhFJUbcTJvB_NnIvP2M', 'Регистрация команд') // 3 курс
  // const task = await taskReader.readTaskAsync('1YnLMVnnHnb6fVw4baGMOcVf8sKmk580P3Oq3UIN1ttQ', 'Регистрация команд') // 2 курс
  const task = await taskReader.readTaskAsync('1oJcZnb909lF2VCyPgxacBIbTqMvNlmLKKY-ZHOpTxWI', 'Регистрация команд') // 1 курс
  if (task === null) return

  const sessionInfo = '3ffe334b-44a7-4758-b9e7-9f47507e74d6'
  const itsAuth = 'CfDJ8Dts5MhElklMuHuZYOOZ4AAt8t6EMHk_zTpEsClp0XQcGVD5kwudXPpyaH9UPeW4B0Q2VN2vyU9GyWaauavzuNHofAmETL_cOsFcKlpMv9XKmMdl7wA8szXUDog_udKNX1sGmtVG-y9xKyIq274HWQjfuOLlDNvzqO-xL-hYejEsc3ARVi9XwKhQhYLbe-IPgRnwJ_lZcKaol5JfnRkPTeiod3CMCFhysNyc7CCyIpsREtK6cgTnt8v0LhtxkD71LAAUOtySaPArQ9DH5Ra1vHufq25h0q06f9IN3aeWcRji-DsDG2pdRBrX6xjeJ8DIkkr7HjaxW7YPKhEX6zpOcvSk1a3OxELSf5K1TK4nqOdxqutcTeP2DDrM-rdA25dx1nxY2an06VLBzF41erwHhx7xLZeDrGtu-CS4Etp4Udg-uLe2zqUIW7UvDcAK-7XnJY_J8WswaHF6p_Zi9ludI4DafxHYTI5emNV6dTD_5sipeKYFmxYR_XRjzNX4fvZ5XWiV0uA9eAbJa4rgOxkViYbCXOCxM4g3srq095VzAdT4O3OzoqAYPzJEXmsMNKDp_IMzoLoFkTFm2gkvpCgIkYVcT6GmVwlZY-vULxFpJWoKnl-G4jldw1Bjn824Opx9W49sDi1Cz5X3poMbGoWBsllLsLv32GvEblrXcsDTYEtUuaOJ_muSI8J3JNyYjUVxUXjJ_8tT7fmQKbC3M7CFz48KU8H9fVb-CZkkmDLxymi2AaJKaYLJkIxxnLgktZTcxwswwosboBtToDlWHAoT5QhjtPGmxbYE6b_0vqFt39Mr7frfH3O8kq-S-xL9iypVvMrLNXC_e8wKo8jWx0wjwK25gqvebm8kr2eGTYllRS4wvIFjSM0UqR5GdDxoTYHuIpODjgnoxR_hn045qzlKyStWisYYCtnVuyITLXKMJPLp66S7VoPaLb9JbeHBNwcaRmDEMwEI_GatwWnc7eSN-PqurZJL7IUYFVtlhL6kRHcWzuTzz0yxZ13lYrYIh0KLew7tGM6czhm6pcQkXX9kAgV-E_Jl73k2eBc8pXxWixRt5Eo0fpdqaSIx-Zx4rILvtxnKHuAKH89FQTM5QESJOkOO0qDdCu4v13VZ9oGG6UlGkK9eFyURlOFkyE9DF7g36vynQN2VsgjzGN59t_xO9MCHHHEo3703YWs1-1CHjFd0naK3hVb-VEjNM3fMQOz4wcRnBY_a3kDDA4tqW853y5cneStFtL2xDPObatr7awzkYZ6TQBU3K56eFben5oSYXLMKVv9JprmqG71bb3VSiZRpmlWyA5ZEq5zzBcWeb68uBwPraaMBrPgw8Y4ULknRyHZne0hZ7x3bDutvtGQ2HfrPjU58lWTpXFuexzVXqGXI5OVMJ7YLVFiWMFrieXQNQfcLmqIhpdal2QL3BMEYXUeBX5GKE3AHcRBprEB9t2AV-IiAW1AND0zRLEtbMMFLAz9e-HtBa6XGF9pcYOjgBD6yVoTQDavh6eDwCZc8gYNtBIz8I-PeqBX7E9Ki_vGvH1QzHwswfZjG2z1S_8ISD_ZPgxP_abv2ieN-2e6jABesVTG0kCZbf1uwm_wwgFE6iG3Ujy2QvEokE4Ft_zx3felmxZjh5TkkfGx7aaxpb72MdI_6CY6wbrY6OkYmTH_EFj0vf1-tWeFlcmUxWGWssUr9W_GtWf1mmLm06FeK6kgtJ1EaSrFGPO35c8NF6XRaXokZC9ITLBtriDU-WTLQiDvakDRsU3QlIZhErccxeO7yiN4h1t61pXdLLqSI5XYKVCEFe5FuKW1KvH9n-z6mFJHcjp6A_Uo-in_9M4HbC9f5YlyqioMLuanJMGTRHX1SHGAgOk8vruHBNhfJAP8pZ1Dt8szN2CL8cC5sCDbwo8hR7CS4jhwTzFVFfeeqpiPG0tByZs_DH9dPaFXBQ8lPA78IJkH5zoVSc0jf4Ls03f3egtUFCa1CmLb4yAj22xquYsoaPanDTaR5aGk_fMvYpbX9-73RwPbYsfoxMxgQObAyiszKke_9Qcwwceq5JGN108iM5dsAkEhD3kb1vMTaNimKmXDoV13Bc4LnunnEjI-k0K-JiO4MuODqEJI2GA4t4VJ5b8kb-t7Y7zwlp5y-0xulwCnDsNJ3sKcbYgaxztI5dU_CzcHga_7vnpYmmEZ0IxdYo71LhKO6Otz-cZjqSUBjaZcZQcHhsstJmkDY-wmulQ3FHC2BFS8dv0JNZNjJSQ5aBIeyYtjfdDbsq_yGsQ8fipivjRw_mPC0IYTUCCocDgnZpoaEsXLi7jaOBddSxvmrMSgYCqYiFk52_NBTv06YuA21ncBGsFqWn9EALiY8QW6uwDZ5KD98PTY0yapocqS1xVhucjGGdmU0y1bx_hQKzcoZWSHW5DCgjiKAD_EBvFW6cEPy5Mbyuaw3j5PTnZTZmSdXJY9jnzTsVaxkXfYqF54wEJv7SK2p-nmcd5jwh2myWTTolUZr80tQWYV5YTg96cqkzzJl5gRVAXImq8c; _ym_isad=1; .AspNetCore.Antiforgery.SdfBlYY3_vg=CfDJ8Dts5MhElklMuHuZYOOZ4ABU5Zi5-nL6JH2qeV5J9uKggoBaL6Q_WUtSrH41KHpXfJvYrzewwIYkltbP2hFeQ8LBITMUd0g65jMU8GaU_mO27TjzHrdYKLbI4AZr734ytju5Ez1G4eYy5yP1zgvEa0o; ItsWsAuth=CfDJ8Dts5MhElklMuHuZYOOZ4ADzVwNQX2_GJNfXrD1HUqXLhxXlshaJWTs9AEsagaRKAnjbJxQSYITwazIDtiK49SmXc319NUi9wKXu_gX2Wp-9ywscZXKF6jlMP9Q2zCsYsMH4pJPg6hYMsT4mDAnAY33JfiP3sSvCNtDDHNRWCQIw1McqJ6FB5AYqguGfOSNDhMTbsSiYeQY8_agoCfuqrwt14kg23u92BSJpvzwdHpB94xq6ksaKPGO_HyGzBlUfPNPsRJR_Lv_eKDg9BAugEGsg181s9E7KhEjlxwXbMBT6BnwnnPGdJwg6_sIieJS4jnlXcGQkmQuaklZZXc_ki2RqZPMiTHQjpHVf60EGC1fguN6RNf1NbYVL_mf0ltr2WzDrTVpQb-Dbr0gMvkMOKigWS4YJG5Ncq1NRWibvsKYFkrUoCphXyYHHn3L7xyLdqnlrsrb82OjAtLW1HOxJbcwHykcuxvDron_1mtKOX4_9AJ8FH28K0zX_JjlU36Nye4pafj1S2o-JCJ9yB34i4oWagcvu0NJmh9IXYWps55GfTFAh7q_OGXRmkIyjOtt-yK2zDfApPDRX2pkpjILGOfw47wJa25X6DrAOL1klYjEA6VsKgrSm-Oc4t0A-aJg3ifEl6lYve58FuV8tQhvBqy_E0PUtD7Y9s-jWPcJFN-xwyZx8ArEQSLBqcly6h6EZaEx4n894u1tYjIQaslBwnTIz8FjcktN5D4ddSypzZc9_kY6vI5i2T7LrFZLT_FpJ-P28uZUgf9tmAMXHrf2fjRbiitjBeOQ8pITh7hTQ-E7AECjfvwfiW7oEDYN_KpNQ0oif6qFA0UGa4hytckiR7s16uM_KAU_bAi3TMKXcMqR5uYcgP_fXMAAuvPGAsvD9Cw6SrUWbnWAdCxm4k0MWcf2rO69IS-F1jp1bJmQdXNzkcmt_MfRd55chlVv85enlUMrV8G3PJeZEKMcUXY6ruf9h7qni8PcjaS3hh4QLk4gg2004_y2mTIlpcJBVhXPbbfObu_X145b19FGjB--Z1FWEHP0m1GWz3Z9udRDphxi9gf0jBBhR3yc-K_BdHf_Z7ZykDoA1D4W6wtWdQaSeBFP6V-Mdbjo4xnEW9V90IEz7pN-QyCyslQov8LVz4hxBikBynRc7Qi4ElC648yzZJqAYIkIH0T1i70zI8AxfdIjGYcwcyoU7fEdFFa1TH1ICdg8gQUT-LVfBupd3HUGEFdG17ptW-uoWriy4oZZzKDjc6up9J1oNUmizXOFOELZZJcOmc75DR-vgqq8CLwuu6AesH5lJxeQM_gUBkKNX5mnx1M67VqsWolCWyoW0jLNyYIoeU5si3K5Do_SthHnM3r3O0txGIp4G23GWEoEtesiHetELuFhCinnTMjLlKH8PHPXro9mccsTU9BxL3_clQSSROeNVy-rX8bIAKb0SIH2tG1Mk41b0XKNSApF1-2LS7y7-RNGiQ_GPyBRmI8fYgaup3KhGreBgG_yhKL9kfNwi_LohR-Q0Dg8D9BbWBnr-GcnGZi6pztltA-71rWDbaiTWdBatkIEwK97DZKBFHF8WAGnS6_ldTM8oQNTwJ2A-I7iiKvgFrNtPrDWir9SKK5hqqCI-p6dFRwxYZV3BqPTvxtZUp8gwGGioV4bO9qVmizQfjzDZmkKbDNVhkaVGcajObRMTJPN_MgH3WKc6acROQ3LDzAroTkG3jgdc23PfGDNViWblHE_6Sc0i2jGQkQ6-GIbESC8Pur21tuVtf52ZnV77v80G9eJyce3-Qwib_8afjgoB981-gFyHbGcYCy_UyNzxrf2ANMP3SlAFv7CeKftN3SK2fYv0mhLA1feGOx7S9wuyD54uJcQteGkJwTvhdsZDjpfVHtdN_JzMDlpkcayBdVhSTo_zz-wLaFwaOYb_rrZfXx-sq2BbIYHdJRii_TuYdxlX_lujK3LTR1TbltLF_xXjsA9-x9ItRski0sB7hajXsxP4-QlLJ5BL8MNnNujSP8YsacTepb1jsjRqXAupE03MAh8p8WatXdffcAFTEyL9Zd7sTvKDWaoJ17qCDzw7J_lGMBDs1xlFtVkH1Zqsu-K05r3FHdQguc5c-D_uxX_nEbuFzlUH-_9hQdpcqqlHLNj7Jx70MIdHRpa4hOEz8mVNByZ7RXO94crDYXxsHHQr4NECpZ_1lRxUHYEgkWKmSndWP4XUT57UPT4z2Ed_00LBxsbCfqZZ54qFy5o19pWFC7REE8DDOosZCe4'
  const itsApi = new ItsApiV2(new ItsAuthV2(sessionInfo, itsAuth), new ItsUrlProvider(false))
  const executor = new DistributeStudentsIntoTeamsTaskExecutor(itsApi)
  await executor.executeAsync(task)
}

async function sendCuratorMarksAsync() {
  const googleAuth = await GoogleAuth.createAsync('ask-if-not-saved')
  const taskReader = new TableTaskReader(new GoogleApi(googleAuth))

  //Проектный практикум курс 3-4
  const task = await taskReader.readTaskAsync('19C8YE8KT61C8VuFt-WpcN2bh9NNgnTy--fRDKvE8470', 'Участники')

  //Проектный практикум курс 2
  //const task = await taskReader.readTaskAsync('1QgjRk0MqpHmR3sBJ65lzptGtpsdlLETLCPCAdggOW6w', 'Оценивание команд')

  //Проектный практикум курс 1
  //const task = await taskReader.readTaskAsync('1quWHq3S93L-aYKvBbo0t6R7yjxYMz-iCimL2FAerHtA', 'Участники')



  if (task === null) return

  const authJwt = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJmRXFJMlNLVm85X19yXzZMZ1hYZVloaEVSSG5jR19VdEVhNVgxT2VLQk5ZIn0.eyJleHAiOjE3Mzc2MTE1NjEsImlhdCI6MTczNzU4MTY3NCwiYXV0aF90aW1lIjoxNzM3NTc1NTYxLCJqdGkiOiI4ZGM3ZjVjMy05OTZmLTRhNzktYTI5OC02ODc5OTFjZmEyYzkiLCJpc3MiOiJodHRwczovL2tleXMudXJmdS5ydS9hdXRoL3JlYWxtcy91cmZ1LWxrIiwic3ViIjoiZDVkYzUyYTYtYWZkYS00MzNiLTgwZjItMTMwMGY0MDYzODU5IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoidGVhbXBybyIsIm5vbmNlIjoiY2Q3NzNhM2UtNjU4ZS00MmM0LTkyMjQtYTIwMmY5ZDFlNDBkIiwic2Vzc2lvbl9zdGF0ZSI6ImUxM2E4ZjM0LWMxYTgtNDk4MC1hNWIyLTUwOGMyZTFjNGExOCIsInNjb3BlIjoib3BlbmlkIGxrLW1hcGVycyIsInNpZCI6ImUxM2E4ZjM0LWMxYTgtNDk4MC1hNWIyLTUwOGMyZTFjNGExOCIsInVzZXIiOnsicGVyc29uIjp7ImlkIjoiSS5BLkRvbWFzaG5pa2giLCJndWlkIjoiYjY0M2QzOWEtN2I3Yi00OTdiLTg4MTctZTFlNzBiMjA1MWE1IiwidGl0bGUiOiLQlNC-0LzQsNGI0L3QuNGFINCY0LLQsNC9INCQ0LvQtdC60YHQtdC10LLQuNGHIiwibGFzdE5hbWUiOiLQlNC-0LzQsNGI0L3QuNGFIiwiZmlyc3ROYW1lIjoi0JjQstCw0L0iLCJtaWRkbGVOYW1lIjoi0JDQu9C10LrRgdC10LXQstC40YciLCJlbWFpbCI6ImkuYS5kb21hc2huaWtoQHVyZnUucnUifSwicm9sZXMiOlt7InVzZXJUeXBlIjoiRW1wbG95ZWUiLCJpZCI6IjJhNzNkODEzLWEwNTgtMTFlZC05ZGMyLTI0OGEwN2Q3YmZlMSIsImVtcGxveW1lbnRUeXBlIjoi0JLQvdC10YjQvdC10LUg0YHQvtCy0LzQtdGB0YLQuNGC0LXQu9GM0YHRgtCy0L4iLCJwb3N0Ijoi0KHRgtCw0YDRiNC40Lkg0L_RgNC10L_QvtC00LDQstCw0YLQtdC70YwiLCJjYXRlZ29yeSI6ItCf0J_QoSIsInJhdGUiOjAuMjUsImRpdmlzaW9uSWQiOiI1N2E4OTBlNi04NmViLTQ0NTEtYWI2Zi05NDhhZGYxMmIyMjQiLCJkaXZpc2lvblRpdGxlIjoi0JTQtdC_0LDRgNGC0LDQvNC10L3RgiDQvNCw0YLQtdC80LDRgtC40LrQuCwg0LzQtdGF0LDQvdC40LrQuCDQuCDQutC-0LzQv9GM0Y7RgtC10YDQvdGL0YUg0L3QsNGD0LoifV19fQ.Vv6WZZmYOREu8CFa351xae1IxF2Gi9sM32qIkt00TUVAOppE-9O6Qr1ynvIVkgvzNUC2RxA7UsH2D7CK4Ye5enNWdKlfcNF0ADIir6x3-eEs8t0w8KTDTonAQHqeDwkUjfMcirj-AYL626LiSkumqHmj0WV37A75Ih_TtjdWfKq_alRhCCi4HU7a-bCjQOh0OOFJCgYCsdp-tTua-wyx2z9wtBfZYSkP9Zh7whlVrEAo-1sd8-vwOyNcvGqeSWVQzdKef5bM5FsowXSoIaEsV3VvzO4Nuo_lQAbf8cXmC_5qKJFXuCA5QfY4kAIZG2rRT8-PuMyvE-Aja3vBWagAWw'
  const teamProjectApi = new TeamProjectApiV2(new TeamProjectAuthV2(authJwt), new TeamProjectUrlProvider(false))
  const executor = new SendCuratorMarksTaskExecutor(teamProjectApi)
  await executor.executeAsync(task)
}

async function createTechnologyCardsAsync() {
  const spreadsheetId = '1itQ1trUjQ9yx6c8FOHzbOc9kSDO-w55ZfMIsGCz9kpE'
  const sheetName = 'Создание техкарт курсов по выбору'
  //const sheetName = 'Создание техкарт основных курсов'

  const googleAuth = await GoogleAuth.createAsync('ask-if-not-saved')
  const googleApi = new GoogleApi(googleAuth)
  const taskReader = new TableTaskReader(googleApi)
  const task = await taskReader.readTaskAsync(spreadsheetId, sheetName)
  if (task === null) return

  const urlProvider = new BrsUrlProvider(false)
  const sid = '1234567890'
  const auth = new BrsAuth(sid)
  const brsApi = new BrsApi(auth, urlProvider)

  const executor = new CreateTechnologyCardsTaskExecutor(brsApi)
  await executor.executeAsync(task)
}

async function exportTechnologyCardsAsync() {
  const spreadsheetId = '1itQ1trUjQ9yx6c8FOHzbOc9kSDO-w55ZfMIsGCz9kpE'
  // const sheetName = 'Основные курсы'
  const sheetName = 'Курсы по выбору'

  const googleAuth = await GoogleAuth.createAsync('ask-if-not-saved')
  const googleApi = new GoogleApi(googleAuth)
  const taskReader = new TableTaskReader(googleApi)
  const taskWriter = new TableTaskWriter(googleApi, spreadsheetId, sheetName)
  const task = await taskReader.readTaskAsync(spreadsheetId, sheetName)
  if (task === null) return

  const urlProvider = new BrsUrlProvider(false)
  const sid = '1234567890'
  const auth = new BrsAuth(sid)
  const brsApi = new BrsApi(auth, urlProvider)

  const executor = new ExportTechnologyCardsTaskExecutor(brsApi, taskWriter)
  await executor.executeAsync(task)
}

async function cloneProjects() {
  const notionApi = new NotionApi(new NotionAuth())
  const partnerApi = new PartnerApi(new PartnerAuth(''), new PartnerUrlProvider(false))

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
