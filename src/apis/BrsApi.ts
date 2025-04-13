import { BrsAuth } from './BrsAuth.js'
import { buildFormData, replaceAll } from '../helpers/tools.js'
import { BrsUrlProvider } from './BrsUrlProvider.js'

export class BrsApi {
  private readonly auth: BrsAuth
  private readonly urlProvider: BrsUrlProvider

  constructor(auth: BrsAuth, urlProvider: BrsUrlProvider) {
    this.auth = auth
    this.urlProvider = urlProvider
  }

  async getDisciplinesAsync(
    year: number,
    termType: TermType,
    course: number,
    isModule: boolean,
  ): Promise<Discipline[]> {
    const total = await getDisciplineTotalAsync(this.urlProvider, this.auth, year, termType, course, isModule)
    const result = await getDisciplinesInternalAsync(this.urlProvider, this.auth, year, termType, course, isModule, total)
    return result
  }

  async getAllStudentMarksAsync(discipline: Discipline): Promise<StudentMark[]> {
    const students = [
      ...(await getStudentMarksAsync(this.urlProvider, this.auth, discipline, 'lecture', 'current')),
      ...(await getStudentMarksAsync(this.urlProvider, this.auth, discipline, 'lecture', 'intermediate')),
      ...(await getStudentMarksAsync(this.urlProvider, this.auth, discipline, 'laboratory', 'current')),
      ...(await getStudentMarksAsync(this.urlProvider, this.auth, discipline, 'laboratory', 'intermediate')),
      ...(await getStudentMarksAsync(this.urlProvider, this.auth, discipline, 'practice', 'current')),
      ...(await getStudentMarksAsync(this.urlProvider, this.auth, discipline, 'practice', 'intermediate')),
      ...(await getStudentMarksAsync(this.urlProvider, this.auth, discipline, 'additionalPractice', 'current')),
      ...(await getStudentMarksAsync(this.urlProvider, this.auth, discipline, 'additionalPractice', 'intermediate')),
    ]

    const uniqueStudents: { [id: string]: StudentMark } = {}
    for (const s of students) {
      const knownStudent = uniqueStudents[s.studentUuid] || {}
      uniqueStudents[s.studentUuid] = { ...knownStudent, ...s }
    }

    return Object.keys(uniqueStudents).map((k) => uniqueStudents[k])
  }

  async getAllControlActionsAsync(discipline: Discipline): Promise<ControlAction[]> {
    return [
      ...(await getControlActionsAsync(this.urlProvider, this.auth, discipline, 'lecture', 'current')),
      ...(await getControlActionsAsync(this.urlProvider, this.auth, discipline, 'lecture', 'intermediate')),
      ...(await getControlActionsAsync(this.urlProvider, this.auth, discipline, 'laboratory', 'current')),
      ...(await getControlActionsAsync(this.urlProvider, this.auth, discipline, 'laboratory', 'intermediate')),
      ...(await getControlActionsAsync(this.urlProvider, this.auth, discipline, 'practice', 'current')),
      ...(await getControlActionsAsync(this.urlProvider, this.auth, discipline, 'practice', 'intermediate')),
      ...(await getControlActionsAsync(this.urlProvider, this.auth, discipline, 'additionalPractice', 'current')),
      ...(await getControlActionsAsync(this.urlProvider, this.auth, discipline, 'additionalPractice', 'intermediate')),
    ]
  }

  async putStudentFailureAsync(
    studentUuid: string,
    discipline: Discipline,
    studentFailure: StudentFailure = StudentFailure.NoFailure,
    cardType: CardType = 'lecture',
  ): Promise<void> {
    const body = `markFailure=${studentFailure}&cardType=${cardType}&disciplineLoad=${discipline.disciplineLoad}&studentId=${studentUuid}`
    await requestApiWithJsonResponseAsync(
      this.urlProvider,
      this.auth,
      `/mrd/mvc/mobile/failure/update`,
      {
        method: 'POST',
        body,
      },
      {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
    )
  }

  async updateAllMarksAsync(discipline: Discipline): Promise<void> {
    await updateMarksAsync(this.urlProvider, this.auth, discipline, 'lecture', 'intermediate')
    await updateMarksAsync(this.urlProvider, this.auth, discipline, 'lecture', 'current')
    await updateMarksAsync(this.urlProvider, this.auth, discipline, 'lecture', 'intermediate')
    await updateMarksAsync(this.urlProvider, this.auth, discipline, 'laboratory', 'current')
    await updateMarksAsync(this.urlProvider, this.auth, discipline, 'laboratory', 'intermediate')
    await updateMarksAsync(this.urlProvider, this.auth, discipline, 'practice', 'current')
    await updateMarksAsync(this.urlProvider, this.auth, discipline, 'practice', 'intermediate')
    await updateMarksAsync(this.urlProvider, this.auth, discipline, 'additionalPractice', 'current')
    await updateMarksAsync(this.urlProvider, this.auth, discipline, 'additionalPractice', 'intermediate')
  }

  async putStudentMarkAsync(
    studentUuid: string,
    controlActionId: string,
    mark: number,
    groupId: string,
    cardTypeKey: CardType,
    disciplineLoadUuid: string,
  ): Promise<StudentMark> {
    const body = `student=${studentUuid}&techcard=${controlActionId}&mark=${
      isNaN(mark) ? '' : mark.toString()
    }&groupId=${groupId}&cardTypeKey=${cardTypeKey}&disciplineLoadUuid=${disciplineLoadUuid}`
    return requestApiWithJsonResponseAsync<StudentMark>(
      this.urlProvider,
      this.auth,
      `/mrd/mvc/mobile/studentMarks/put`,
      {
        method: 'POST',
        body,
      },
      {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
    )
  }

  async getTechnologyCardsAsync(
    year: number,
    termType: TermType,
    course: number,
    isModule: boolean,
    search: string = '',
  ): Promise<TechnologyCard[]> {
    return getTechnologyCardsAsync(this.urlProvider, this.auth, year, termType, course, isModule, search)
  }

  async getTechnologyCardIntermediateAsync(technologyCard: TechnologyCard): Promise<TechnologyCardIntermediate | null> {
    return getTechnologyCardIntermediateAsync(this.urlProvider, this.auth, technologyCard)
  }

  async putTechnologyCardIntermediateAsync(
    intermediate: TechnologyCardIntermediate,
    newCardType: CardType,
  ): Promise<void> {
    const body: { [k: string]: any } = {
      code: intermediate.code,
      technologyCardType: newCardType,
      controlAction: intermediate.controlAction,
      maxValue: intermediate.maxValue,
      disciplineLoad: intermediate.disciplineLoad,
    }
    return postFormWithJsonResponseAsync(this.urlProvider, this.auth, `/mrd/mvc/mobile/technologyCard/items/update`, body)
  }

  async getTechnologyCardFactorsAsync(technologyCard: TechnologyCard): Promise<TechnologyCardFactor[] | null> {
    return getTechnologyCardFactorsAsync(this.urlProvider, this.auth, technologyCard)
  }

  async updateTechnologyCardFactorsAsync(
    technologyCard: TechnologyCard,
    technologyCardType: CardType,
    current: number,
    intermediate: number,
    total: number,
  ): Promise<void> {
    const body = {
      disciplineLoad: technologyCard.disciplineLoad,
      technologyCardType: technologyCardType,
      current: current,
      intermediate: intermediate,
      total: total,
    }
    return postFormWithJsonResponseAsync(this.urlProvider, this.auth, `/mrd/mvc/mobile/technologyCard/factors/update`, body)
  }

  async getTechnologyCardLoadsAsync(
    technologyCard: TechnologyCard,
    technologyCardType: CardType,
  ): Promise<TechnologyCardLoad[] | null> {
    return await getTechnologyCardLoadsAsync(this.urlProvider, this.auth, technologyCard, technologyCardType)
  }

  async deleteTechnologyCardLoadAsync(load: TechnologyCardLoad): Promise<boolean> {
    const body = {
      code: load.code,
    }
    const result = await postFormWithJsonResponseAsync<{ errorMessage?: string }>(
      this.urlProvider,
      this.auth,
      `/mrd/mvc/mobile/technologyCard/items/delete`,
      body,
    )

    return !result.errorMessage
  }

  async addTechnologyCardLoadAsync(
    technologyCard: TechnologyCard,
    technologyCardType: CardType,
    name: string,
    maxValue: number,
  ): Promise<string | null> {
    const body = {
      disciplineLoad: technologyCard.disciplineLoad,
      technologyCardType: technologyCardType,
      controlAction: name,
      maxValue: maxValue,
    }
    const result = await postFormWithJsonResponseAsync<{ uuid: string }>(
      this.urlProvider,
      this.auth,
      `/mrd/mvc/mobile/technologyCard/items/add`,
      body,
    )
    return result.uuid || null
  }

  async updateTechnologyCardLoadAsync(
    technologyCard: TechnologyCard,
    technologyCardLoad: TechnologyCardLoad,
    name: string,
    maxValue: number,
  ): Promise<string | null> {
    const body = {
      disciplineLoad: technologyCard.disciplineLoad,
      technologyCardType: technologyCardLoad.technologyCardType,
      code: technologyCardLoad.code,
      controlAction: name,
      maxValue: maxValue,
    }
    const result = await postFormWithJsonResponseAsync<{ uuid: string }>(
      this.urlProvider,
      this.auth,
      `/mrd/mvc/mobile/technologyCard/items/update`,
      body,
    )
    return result.uuid || null
  }

  async checkTechnologyCardAsync(technologyCard: TechnologyCard): Promise<TechnologyCardCheck> {
    const response = await requestApiWithTextResponseAsync(
      this.urlProvider,
      this.auth,
      `/mrd/mvc/mobile/view/technologyCard/${technologyCard.disciplineLoad}/agreed/`,
    )

    const lines = response.split('\r\n').map((s) => s.trim())

    let isFilled = false
    const isCorrectPrefix = 'var message = "Ошибок в тех карте не обнаружено.";'
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith(isCorrectPrefix)) {
        isFilled = true
        break
      }
    }

    let isAllowedToAgree = false
    const canAgreePrefix = '<a class="button" id="agreed-button"'
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith(canAgreePrefix)) {
        isAllowedToAgree = true
        break
      }
    }

    return {
      isFilled,
      isAllowedToAgree,
    }
  }

  async agreeTechnologyCardAsync(technologyCard: TechnologyCard, agreed: boolean): Promise<void> {
    const body = {
      agreed: agreed,
      disciplineLoad: technologyCard.disciplineLoad,
    }
    await postFormWithTextResponseAsync(this.urlProvider, this.auth, `/mrd/mvc/mobile/technologyCard/doAgreed`, body)
  }
}

async function getDisciplinesInternalAsync(
  urlProvider: BrsUrlProvider,
  auth: BrsAuth,
  year: number,
  termType: TermType,
  course: number,
  isModule: boolean,
  total: number,
): Promise<Discipline[]> {
  const queryString = `?year=${year}&termType=${termType}&course=${course}&total=${total}&page=1&pageSize=${total}&search=`
  if (isModule) {
    const paging = await requestApiWithJsonResponseAsync<Paging<Discipline>>(
      urlProvider,
      auth,
      '/mrd/mvc/mobile/module/fetch' + queryString,
    )
    const disciplines = paging.content
    for (const d of disciplines) {
      d.isModule = true
    }
    return disciplines
  } else {
    const paging = await requestApiWithJsonResponseAsync<Paging<Discipline>>(
      urlProvider,
      auth,
      '/mrd/mvc/mobile/discipline/fetch' + queryString,
    )
    const disciplines = paging.content
    for (const d of disciplines) {
      d.isModule = false
    }
    return disciplines
  }
}

async function getDisciplineTotalAsync(
  urlProvider: BrsUrlProvider,
  auth: BrsAuth,
  year: number,
  termType: TermType,
  course: number,
  isModule: boolean,
) {
  const moduleParameter = isModule ? '&its=true' : ''
  const queryString = `?year=${year}&termType=${termType}&course=${course}` + moduleParameter
  const total = await requestApiWithJsonResponseAsync<number>(urlProvider, auth, '/mrd/mvc/mobile/discipline/amount' + queryString)
  return total
}

async function getStudentMarksAsync(
  urlProvider: BrsUrlProvider,
  auth: BrsAuth,
  discipline: Discipline,
  cardType: CardType,
  markType: MarkType,
  isTotal: boolean = false,
  showActiveStudents: boolean = false,
) {
  const { disciplineLoad, isModule } = discipline
  const groupUuid = discipline.groupHistoryId
  const techgroup = discipline.groupId

  const groupPart = isModule ? `techgroup=${techgroup}` : `groupUuid=${groupUuid}`
  return requestApiWithJsonResponseAsync<StudentMark[]>(
    urlProvider,
    auth,
    `/mrd/mvc/mobile/studentMarks/fetch?disciplineLoad=${disciplineLoad}&${groupPart}` +
      `&cardType=${cardType}&hasTest=false&isTotal=${isTotal}` +
      `&intermediate=${markType === 'intermediate'}` +
      `&selectedTeachers=null&showActiveStudents=${showActiveStudents}`,
  )
}

async function getControlActionsAsync(
  urlProvider: BrsUrlProvider,
  auth: BrsAuth,
  discipline: Discipline,
  cardType: CardType,
  markType: MarkType,
): Promise<ControlAction[]> {
  const { disciplineLoad, isModule } = discipline
  const groupUuid = discipline.groupHistoryId
  const techgroup = discipline.groupId

  const modulePart = isModule ? '/module' : ''
  const groupPart = isModule ? techgroup : groupUuid
  const response = await requestApiWithTextResponseAsync(
    urlProvider,
    auth,
    `/mrd/mvc/mobile/view/mark/${disciplineLoad}/${groupPart}/teachers${modulePart}/${cardType}/${markType}`,
  )

  const prefix = 'gridColumns = toTextArray('
  const suffix = ');'
  const linesWithId = response
    .split('\r\n')
    .map((s) => s.trim())
    .filter((s) => s.startsWith(prefix))
  if (linesWithId.length !== 1) {
    throw new Error('Control actions page should contain single line target line with techcard identifier')
  }

  const columns: Array<{ controlAction: string; uuid: string }> =
    JSON.parse(linesWithId[0].substr(prefix.length, linesWithId[0].length - prefix.length - suffix.length)) || []

  const uuidPrefix = 'technologyCard'
  const result = columns
    .filter((c) => c.uuid && c.uuid.startsWith(uuidPrefix))
    .map((c) => ({
      uuid: c.uuid,
      uuidWithoutPrefix: c.uuid.substr(uuidPrefix.length),
      controlAction: c.controlAction,
    }))
  return result as ControlAction[]
}

async function updateMarksAsync(urlProvider: BrsUrlProvider, auth: BrsAuth, discipline: Discipline, cardType: CardType, markType: MarkType) {
  const { disciplineLoad, isModule } = discipline
  const groupUuid = discipline.groupHistoryId
  const techgroup = discipline.groupId

  const modulePart = isModule ? '/module' : ''
  const groupPart = isModule ? `techgroup=${techgroup}` : `groupUuid=${groupUuid}`
  const body =
    `disciplineLoad=${disciplineLoad}&${groupPart}` +
    `&cardType=${cardType}&hasTest=false&isTotal=false` +
    `&intermediate=${markType === 'intermediate'}` +
    `&selectedTeachers=null&showActiveStudents=true`
  return requestApiWithTextResponseAsync(
    urlProvider,
    auth,
    `/mrd/mvc/mobile/updateMarks${modulePart}`,
    {
      method: 'POST',
      body,
    },
    {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  )
}

async function getTechnologyCardsAsync(
  urlProvider: BrsUrlProvider,
  auth: BrsAuth,
  year: number,
  termType: TermType,
  course: number,
  isModule: boolean,
  search: string = '',
): Promise<TechnologyCard[]> {
  const queryString = `?year=${year}&termType=${termType}&course=${course}&page=1&pageSize=1000&search=${encodeURIComponent(
    search,
  )}`
  if (isModule) {
    const cards = await requestApiWithJsonResponseAsync<Array<TechnologyCard>>(
      urlProvider,
      auth,
      '/mrd/mvc/mobile/technologyCard/module/fetch' + queryString,
    )
    for (const c of cards) {
      c.isModule = true
    }
    return cards
  } else {
    const paging = await requestApiWithJsonResponseAsync<Paging<TechnologyCard>>(
      urlProvider,
      auth,
      '/mrd/mvc/mobile/technologyCard/discipline/page' + queryString,
    )
    const cards = paging.content
    for (const c of cards) {
      c.isModule = false
    }
    return cards
  }
}

async function getTechnologyCardLoadsAsync(
  urlProvider: BrsUrlProvider,
  auth: BrsAuth,
  technologyCard: TechnologyCard,
  cardType: CardType,
): Promise<TechnologyCardLoad[] | null> {
  // var dataItems = [{"controlActionURL":null,"code":"8aca614b8b040471018b60c50f1c0f89","endDate":"24.12.2023","maxValue":100,"technologyCardTypeName":"практические занятия","standart":1,"technologyCardType":"practice","hasMarks":false,"name":"зачет","intermediate":1,"action":"prz","startDate":"01.09.2023","intermediateName":"Промежуточная"},{"controlActionURL":null,"code":"8aca614b8b040471018b60c512aa0f8a","endDate":"24.12.2023","maxValue":20,"technologyCardTypeName":"практические занятия","standart":1,"technologyCardType":"practice","hasMarks":false,"name":"домашняя работа","intermediate":0,"action":"prdr","startDate":"01.09.2023","intermediateName":"Текущая"},{"controlActionURL":null,"code":"8aca614b8b040471018b60c512b90f8b","endDate":"24.12.2023","maxValue":20,"technologyCardTypeName":"практические занятия","standart":1,"technologyCardType":"practice","hasMarks":false,"name":"домашняя работа","intermediate":0,"action":"prdr","startDate":"01.09.2023","intermediateName":"Текущая"},{"controlActionURL":null,"code":"8aca614b8b040471018b60c512b90f8c","endDate":"24.12.2023","maxValue":20,"technologyCardTypeName":"практические занятия","standart":1,"technologyCardType":"practice","hasMarks":false,"name":"домашняя работа","intermediate":0,"action":"prdr","startDate":"01.09.2023","intermediateName":"Текущая"},{"controlActionURL":null,"code":"8aca614b8b040471018b60c512b90f8d","endDate":"24.12.2023","maxValue":20,"technologyCardTypeName":"практические занятия","standart":1,"technologyCardType":"practice","hasMarks":false,"name":"контрольная работа","intermediate":0,"action":"prkr","startDate":"01.09.2023","intermediateName":"Текущая"},{"controlActionURL":null,"code":"8aca614b8b040471018b60c512c90f8e","endDate":"24.12.2023","maxValue":20,"technologyCardTypeName":"практические занятия","standart":1,"technologyCardType":"practice","hasMarks":false,"name":"контрольная работа","intermediate":0,"action":"prkr","startDate":"01.09.2023","intermediateName":"Текущая"}];
  const response = await requestApiWithTextResponseAsync(
    urlProvider,
    auth,
    `/mrd/mvc/mobile/view/technologyCard/${technologyCard.disciplineLoad}/loadtype/${cardType}`,
  )

  const lines = response.split('\r\n').map((s) => s.trim())

  const prefix = 'var dataItems = '
  const suffix = ';'
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith(prefix)) {
      const value = line.substr(prefix.length, line.length - prefix.length - suffix.length).trim()
      const json = JSON.parse(value) as TechnologyCardLoad[]
      return json
    }
  }

  return null
}

async function getTechnologyCardFactorsAsync(
  urlProvider: BrsUrlProvider,
  auth: BrsAuth,
  technologyCard: TechnologyCard,
): Promise<TechnologyCardFactor[] | null> {
  const response = await requestApiWithTextResponseAsync(
    urlProvider,
    auth,
    `/mrd/mvc/mobile/view/technologyCard/${technologyCard.disciplineLoad}/factors`,
  )

  const lines = response.split('\r\n').map((s) => s.trim())
  const actions = extractTechnologyCardFactorActions(lines)
  const factors = extractTechnologyCardFactors(lines)

  if (factors === null || actions === null) {
    return null
  }

  for (const action of actions) {
    const factor = factors.filter((f) => f.technologyCardType === action.action)[0]
    if (factor) {
      factor.technologyCardTypeTitle = action.actionTitle
    } else {
      factors.push({
        current: NaN,
        intermediate: NaN,
        readonly: false,
        technologyCardType: action.action,
        technologyCardTypeTitle: action.actionTitle,
        total: NaN,
      })
    }
  }

  return factors
}

function extractTechnologyCardFactorActions(lines: string[]): TechnologyCardFactorAction[] | null {
  //var data = [{"actionTitle":"лекции","action":"lecture"},{"actionTitle":"лабораторные занятия","action":"laboratory"}];

  const prefix = 'var data = '
  const suffix = ';'
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith(prefix)) {
      const value = line.substr(prefix.length, line.length - prefix.length - suffix.length).trim()
      const json = JSON.parse(value) as TechnologyCardFactorAction[]
      return json
    }
  }

  return null
}

function extractTechnologyCardFactors(lines: string[]): TechnologyCardFactor[] | null {
  const prefix = 'var factorsData = '
  const suffix = ';'
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith(prefix)) {
      const value = line.substr(prefix.length, line.length - prefix.length - suffix.length).trim()
      const json = JSON.parse(value) as TechnologyCardFactor[]
      return json
    }
  }

  return null
}

async function getTechnologyCardIntermediateAsync(
  urlProvider: BrsUrlProvider,
  auth: BrsAuth,
  technologyCard: TechnologyCard,
): Promise<TechnologyCardIntermediate | null> {
  const response = await requestApiWithTextResponseAsync(
    urlProvider,
    auth,
    `/mrd/mvc/mobile/view/technologyCard/${technologyCard.disciplineLoad}/intermediate`,
  )

  const lines = response.split('\r\n').map((s) => s.trim())

  const availableCardTypes = extractAvailableIntermediateCardTypes(lines)
  if (!availableCardTypes) {
    return null
  }
  const params = extractUpdateIntermediateParams(lines)
  if (!params) {
    return null
  }
  const currentCardType = extractCurrentIntermediateCardType(lines, params.code)

  return {
    availableCardTypes: availableCardTypes.map((it) => ({ cardType: it.code, cardTypeTitle: it.name })),
    code: params.code,
    controlAction: params.controlAction,
    disciplineLoad: params.disciplineLoad,
    maxValue: params.maxValue,
    currentCardType: currentCardType,
  }
}

function extractAvailableIntermediateCardTypes(lines: Array<string>): Array<{ code: CardType; name: string }> | null {
  // >> Sample <<
  // var technologyCardTypeDS = new kendo.data.DataSource({
  //   data: [
  //          {code:'lecture', name:'лекции'},{code:'laboratory', name:'лабораторные занятия'}
  //     ]
  // });

  const prefix = 'var technologyCardTypeDS = new kendo.data.DataSource({'
  const suffix = '});'
  let start = -1
  const dataLines = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (start < 0) {
      if (line.startsWith(prefix)) {
        start = i
      }
    } else {
      if (line.startsWith(suffix)) {
        break
      }
      dataLines.push(line)
    }
  }

  if (dataLines.length > 0) {
    try {
      let v = '{' + dataLines.join('') + '}'
      v = replaceAll(v, 'data', '"data"')
      v = replaceAll(v, 'code', '"code"')
      v = replaceAll(v, 'name', '"name"')
      v = replaceAll(v, `'`, `"`)
      const json = JSON.parse(v) as { data: [{ code: CardType; name: string }] }
      return json.data
    } catch {
      return null
    }
  }

  return null
}

function extractUpdateIntermediateParams(lines: Array<string>): TechnologyCardUpdateIntermediateParams | null {
  // >> Sample <<
  // var params = {
  //   code: '8aca614b8b040471018b60c50f1c0f89',
  //   technologyCardType: value,
  //   controlAction: 'зачет',
  //   maxValue: 100,
  //   disciplineLoad: 'unpldd195e3pg0000oggql7omahamg34-00000000000000000000000000000000'
  // };

  const prefix = 'var params = {'
  const suffix = '};'
  let start = -1
  const dataLines = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (start < 0) {
      if (line.startsWith(prefix)) {
        start = i
      }
    } else {
      if (line.startsWith(suffix)) {
        break
      }
      dataLines.push(line)
    }
  }

  if (dataLines.length > 0) {
    try {
      const obj: { [k: string]: string | number } = {}
      for (const line of dataLines) {
        const parts = line.split(':')
        const key = parts[0].trim()
        switch (key) {
          case 'code':
          case 'controlAction':
          case 'disciplineLoad':
            const v1 = parts[1].trim()
            const v2 = v1[v1.length - 1] === ',' ? v1.substring(0, v1.length - 1) : v1
            const v3 = v2.startsWith(`'`) ? v2.substring(1, v2.length - 1) : v2
            obj[key] = v3
            break
          case 'maxValue':
            obj[key] = parseInt(parts[1].trim(), 10)
          default:
            break
        }
      }
      return obj as unknown as TechnologyCardUpdateIntermediateParams
    } catch {
      return null
    }
  }
  return null
}

function extractCurrentIntermediateCardType(lines: Array<string>, code: string): CardType | null {
  // >> Sample <<
  // oldValues['8aca614b8df25760018e83c02e540a5c'] = 'intermediate';
  // или
  // oldValues['8aca614b8b040471018b60c50f1c0f89'] = 'practice';

  const prefix = `oldValues['${code}'] = '`
  const suffix = `';`
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith(prefix)) {
      const value = line.substr(prefix.length, line.length - prefix.length - suffix.length).trim()
      if (value === 'intermediate') {
        return null
      }
      return value as CardType
    }
  }

  return null
}

async function postFormWithJsonResponseAsync<T>(urlProvider: BrsUrlProvider, auth: BrsAuth, uri: string, body: any) {
  const response = await requestApiWithJsonResponseAsync<T>(
    urlProvider,
    auth,
    uri,
    {
      method: 'POST',
      body: buildFormData(body),
    },
    {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  )
  return response
}

async function postFormWithTextResponseAsync(urlProvider: BrsUrlProvider, auth: BrsAuth, uri: string, body: any) {
  const response = await requestApiWithTextResponseAsync(
    urlProvider,
    auth,
    uri,
    {
      method: 'POST',
      body: buildFormData(body),
    },
    {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  )
  return response
}

async function requestApiWithJsonResponseAsync<T>(
  urlProvider: BrsUrlProvider,
  auth: BrsAuth,
  uri: string,
  options?: RequestOptions,
  headers?: RequestHeaders,
): Promise<T> {
  const response = await requestApiAsync(urlProvider, auth, uri, options, headers)
  if (response.headers.get('Content-Type')?.startsWith('application/json')) {
    const json = await response.json()
    return json as T
  } else {
    console.log(uri + ' is Forbidden')
    throw new Error(uri + ' is Forbidden')
  }
}

async function requestApiWithTextResponseAsync(
  urlProvider: BrsUrlProvider,
  auth: BrsAuth,
  uri: string,
  options?: RequestOptions,
  headers?: RequestHeaders,
): Promise<string> {
  const response = await requestApiAsync(urlProvider, auth, uri, options, headers)
  return await response.text()
}

async function requestApiAsync(
  urlProvider: BrsUrlProvider,
  auth: BrsAuth,
  uri: string,
  options?: RequestOptions,
  headers?: RequestHeaders,
): Promise<Response> {
  const url = urlProvider.baseUrl + uri
  const timeout = 30000
  try {
    const response = await fetch(url, {
      method: 'GET',
      ...options,
      headers: {
        Cookie: `JSESSIONID=${auth.sid}`,
        "X-Cookie": `JSESSIONID=${auth.sid}`, // NOTE: для CORS-PROXY
        ...headers,
      },
      signal: AbortSignal.timeout(timeout),
    })
    return response
  } catch (e: any) {
    if (e.name && e.name === 'TimeoutError') {
      console.log(`${timeout} ms timeout`)
    } else {
      console.log(e)
    }
    throw e
  }
}

interface RequestOptions {
  method?: string
  body?: string | null
}

interface RequestHeaders {
  'Content-Type'?: 'application/x-www-form-urlencoded; charset=UTF-8' | 'application/json; charset=UTF-8'
}

export enum TermType {
  Fall = 1,
  Spring = 2,
}

export type CardType = 'lecture' | 'laboratory' | 'practice' | 'additionalPractice'
export type MarkType = 'intermediate' | 'current'

interface Paging<T> {
  content: T[]
  last: boolean
  totalPages: number
  totalElements: number
  size: number
  number: number
  sort: any
  first: boolean
  numberOfElements: number
}

export interface RegisterInfo {
  registerInfoStr: string
  registerId: number
  passDate: any
  cardType: string
  sheet: string
}

export interface Discipline {
  groupId: string
  discipline: string
  group: string
  registerInfo: RegisterInfo[]
  disciplineLoad: string
  groupHistoryId: string
  isModule: boolean
}

export interface StudentMark {
  studentPersonalNumber: string // '09800106',
  isEdit: boolean // false
  studentUuid: string // 'studen18hc2jg0000magk6mi3iec84bsundigr18hc2jg0000m53o7mlgvora278'
  status: number // 1
  studentStatus: string // 'Активный'
  ignoreCurrentDebars: boolean // false
  studentFio: string // 'Анисимова Маргарита Васильевна'
  isExtern: boolean // false
  teacherName: string // ''
  cardType: CardType // 'lecture'
  studentName: string // 'Анисимова М.В.'
  studentGroup: string // 'РИ-180001'
  registerClosed: boolean // false
  subgroupsITS: string // ''
  disciplineLoad: string // 'unpldd18hc2jg0000m5kojcd3te76bnk'
  failure?: StudentFailure
  failureName?: string
  [props: string]: number | string | boolean | StudentFailure | undefined
}

export interface ControlAction {
  uuid: string
  uuidWithoutPrefix: string
  controlAction: string
}

export enum StudentFailure {
  /** -, дефис, все хорошо */ NoFailure = -1,
  /** Не выбрана */ NotChosen = -19,
  /** Не допущен (деканат) */ NotAllowedByDeansOffice = -18,
  /** Не явился */ NotAppeared = 0,
  /** Неуважительная */ DisrespectfulReason = 12,
  /** Уважительная */ RespectfulReason = 13,
  /** Не допущен */ NotAllowedByTeacher = 18,
  /** Не должен сдавать */ ShouldNotPass = 19,
  /** Академический отпуск */ AcademicLeave = 20,
  /** Выбыл */ DroppedOut = 21,
}

export interface TechnologyCard {
  disciplineLoad: string
  discipline: string
  agreed: boolean
  group: string
  isModule: boolean
}

export interface TechnologyCardIntermediate {
  code: string // '8aca614b8df25760018e83c02e540a5c'
  disciplineLoad: string // 'unpldd195e3pg0000oggql7nup388a14-00000000000000000000000000000000'
  availableCardTypes: { cardType: CardType; cardTypeTitle: string }[]
  currentCardType: CardType | null
  maxValue: number // 100
  controlAction: string // 'экзамен'
}

interface TechnologyCardUpdateIntermediateParams {
  code: string // '8aca614b8df25760018e83c02e540a5c'
  disciplineLoad: string // 'unpldd195e3pg0000oggql7nup388a14-00000000000000000000000000000000'
  maxValue: number // 100
  controlAction: string // 'экзамен'
}

export interface TechnologyCardFactor {
  intermediate: number // 0.5
  technologyCardType: CardType // 'practice'
  technologyCardTypeTitle: string
  current: number // 0.5
  total: number // 1.0
  readonly: boolean // false
}

interface TechnologyCardFactorAction {
  actionTitle: string // 'лекции'
  action: CardType // 'lecture'
}

export interface TechnologyCardLoad {
  controlActionURL: string | null // null
  code: string // '8aca614b8b040471018b60c50f1c0f89'
  endDate: string // '24.12.2023'
  maxValue: number // 100 или 20
  technologyCardTypeName: string // 'практические занятия'
  standart: number // 1
  technologyCardType: CardType // 'practice'
  hasMarks: boolean // false
  name: string // 'домашняя работа' 'зачет'
  intermediate: 0 | 1 // 0 или 1
  action: string // 'prz' - зачет 'prdr' - домашняя работа 'prkr' - контрольная работа
  startDate: string // '01.09.2023'
  intermediateName: string // 'Промежуточная' или 'Текущая'
}

export interface TechnologyCardCheck {
  isFilled: boolean
  isAllowedToAgree: boolean
}
