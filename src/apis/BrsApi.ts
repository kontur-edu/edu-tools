import fetch, { Response } from 'node-fetch'
import { BrsAuth } from './BrsAuth.js'
const baseUrl = 'https://brs.urfu.ru'

export class BrsApi {
  auth: BrsAuth

  constructor(auth: BrsAuth) {
    this.auth = auth
  }

  async getDisciplinesAsync(year: number, termType: TermType, course: number, isModule: boolean) {
    const total = await getDisciplineTotalAsync(this.auth, year, termType, course, isModule)
    const result = await getDisciplinesInternalAsync(this.auth, year, termType, course, isModule, total)
    return result
  }

  async getAllStudentMarksAsync(discipline: Discipline) {
    const students = [
      ...(await getStudentMarksAsync(this.auth, discipline, 'lecture', 'current')),
      ...(await getStudentMarksAsync(this.auth, discipline, 'lecture', 'intermediate')),
      ...(await getStudentMarksAsync(this.auth, discipline, 'laboratory', 'current')),
      ...(await getStudentMarksAsync(this.auth, discipline, 'laboratory', 'intermediate')),
      ...(await getStudentMarksAsync(this.auth, discipline, 'practice', 'current')),
      ...(await getStudentMarksAsync(this.auth, discipline, 'practice', 'intermediate')),
      ...(await getStudentMarksAsync(this.auth, discipline, 'additionalPractice', 'current')),
      ...(await getStudentMarksAsync(this.auth, discipline, 'additionalPractice', 'intermediate')),
    ]

    const uniqueStudents: { [id: string]: StudentMark } = {}
    for (const s of students) {
      const knownStudent = uniqueStudents[s.studentUuid] || {}
      uniqueStudents[s.studentUuid] = { ...knownStudent, ...s }
    }

    return Object.keys(uniqueStudents).map((k) => uniqueStudents[k])
  }

  async getAllControlActionsAsync(discipline: Discipline) {
    return [
      ...(await getControlActionsAsync(this.auth, discipline, 'lecture', 'current')),
      ...(await getControlActionsAsync(this.auth, discipline, 'lecture', 'intermediate')),
      ...(await getControlActionsAsync(this.auth, discipline, 'laboratory', 'current')),
      ...(await getControlActionsAsync(this.auth, discipline, 'laboratory', 'intermediate')),
      ...(await getControlActionsAsync(this.auth, discipline, 'practice', 'current')),
      ...(await getControlActionsAsync(this.auth, discipline, 'practice', 'intermediate')),
      ...(await getControlActionsAsync(this.auth, discipline, 'additionalPractice', 'current')),
      ...(await getControlActionsAsync(this.auth, discipline, 'additionalPractice', 'intermediate')),
    ]
  }

  async putStudentFailureAsync(
    studentUuid: string,
    discipline: Discipline,
    studentFailure: StudentFailure = StudentFailure.NoFailure,
    cardType: CardType = 'lecture',
  ) {
    const body = `markFailure=${studentFailure}&cardType=${cardType}&disciplineLoad=${discipline.disciplineLoad}&studentId=${studentUuid}`
    await requestApiWithJsonResponseAsync(
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

  async updateAllMarksAsync(discipline: Discipline) {
    await updateMarksAsync(this.auth, discipline, 'lecture', 'intermediate')
    await updateMarksAsync(this.auth, discipline, 'lecture', 'current')
    await updateMarksAsync(this.auth, discipline, 'lecture', 'intermediate')
    await updateMarksAsync(this.auth, discipline, 'laboratory', 'current')
    await updateMarksAsync(this.auth, discipline, 'laboratory', 'intermediate')
    await updateMarksAsync(this.auth, discipline, 'practice', 'current')
    await updateMarksAsync(this.auth, discipline, 'practice', 'intermediate')
    await updateMarksAsync(this.auth, discipline, 'additionalPractice', 'current')
    await updateMarksAsync(this.auth, discipline, 'additionalPractice', 'intermediate')
  }

  async putStudentMarkAsync(
    studentUuid: string,
    controlActionId: string,
    mark: number,
    groupId: string,
    cardTypeKey: CardType,
    disciplineLoadUuid: string,
  ) {
    const body = `student=${studentUuid}&techcard=${controlActionId}&mark=${
      isNaN(mark) ? '' : mark.toString()
    }&groupId=${groupId}&cardTypeKey=${cardTypeKey}&disciplineLoadUuid=${disciplineLoadUuid}`
    return requestApiWithJsonResponseAsync<StudentMark>(
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
  ) {
    return getTechnologyCardsAsync(this.auth, year, termType, course, isModule, search)
  }

  async getTechnologyCardIntermediateAsync(technologyCard: TechnologyCard) {
    return getTechnologyCardIntermediateAsync(this.auth, technologyCard)
  }
}

async function getDisciplinesInternalAsync(
  auth: BrsAuth,
  year: number,
  termType: TermType,
  course: number,
  isModule: boolean,
  total: number,
) {
  const queryString = `?year=${year}&termType=${termType}&course=${course}&total=${total}&page=1&pageSize=${total}&search=`
  if (isModule) {
    const paging = await requestApiWithJsonResponseAsync<Paging<Discipline>>(
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
  auth: BrsAuth,
  year: number,
  termType: TermType,
  course: number,
  isModule: boolean,
) {
  const moduleParameter = isModule ? '&its=true' : ''
  const queryString = `?year=${year}&termType=${termType}&course=${course}` + moduleParameter
  const total = await requestApiWithJsonResponseAsync<number>(auth, '/mrd/mvc/mobile/discipline/amount' + queryString)
  return total
}

async function getStudentMarksAsync(
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
    auth,
    `/mrd/mvc/mobile/studentMarks/fetch?disciplineLoad=${disciplineLoad}&${groupPart}` +
      `&cardType=${cardType}&hasTest=false&isTotal=${isTotal}` +
      `&intermediate=${markType === 'intermediate'}` +
      `&selectedTeachers=null&showActiveStudents=${showActiveStudents}`,
  )
}

async function getControlActionsAsync(auth: BrsAuth, discipline: Discipline, cardType: CardType, markType: MarkType) {
  const { disciplineLoad, isModule } = discipline
  const groupUuid = discipline.groupHistoryId
  const techgroup = discipline.groupId

  const modulePart = isModule ? '/module' : ''
  const groupPart = isModule ? techgroup : groupUuid
  const response = await requestApiWithTextResponseAsync(
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

async function updateMarksAsync(auth: BrsAuth, discipline: Discipline, cardType: CardType, markType: MarkType) {
  return updateMarksInternalAsync(
    auth,
    discipline.disciplineLoad,
    discipline.isModule,
    discipline.groupHistoryId,
    discipline.groupId,
    cardType,
    markType,
  )
}

async function updateMarksInternalAsync(
  auth: BrsAuth,
  disciplineLoad: string,
  isModule: boolean,
  groupUuid: string,
  techgroup: string,
  cardType: CardType,
  markType: MarkType,
) {
  const modulePart = isModule ? '/module' : ''
  const groupPart = isModule ? `techgroup=${techgroup}` : `groupUuid=${groupUuid}`
  const body =
    `disciplineLoad=${disciplineLoad}&${groupPart}` +
    `&cardType=${cardType}&hasTest=false&isTotal=false` +
    `&intermediate=${markType === 'intermediate'}` +
    `&selectedTeachers=null&showActiveStudents=true`
  return requestApiWithTextResponseAsync(
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
  auth: BrsAuth,
  year: number,
  termType: TermType,
  course: number,
  isModule: boolean,
  search: string = '',
) {
  const queryString = `?year=${year}&termType=${termType}&course=${course}&page=1&pageSize=100&search=${encodeURIComponent(
    search,
  )}`
  if (isModule) {
    const paging = await requestApiWithJsonResponseAsync<Paging<TechnologyCard>>(
      auth,
      '/mrd/mvc/mobile/technologyCard/module/fetch' + queryString,
    )
    const cards = paging.content
    for (const c of cards) {
      c.isModule = true
    }
    return cards
  } else {
    const paging = await requestApiWithJsonResponseAsync<Paging<TechnologyCard>>(
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

async function getTechnologyCardIntermediateAsync(
  auth: BrsAuth,
  technologyCard: TechnologyCard,
): Promise<TechnologyCardIntermediate | null> {
  const response = await requestApiWithTextResponseAsync(
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
  if (!currentCardType) {
    return null
  }

  return {
    availableCardTypes: availableCardTypes,
    code: params.code,
    controlAction: params.controlAction,
    disciplineLoad: params.disciplineLoad,
    maxValue: params.maxValue,
    currentCardType: currentCardType,
  }
}

function extractAvailableIntermediateCardTypes(lines: Array<string>): Array<CardType> | null {
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
      const json = JSON.parse('{' + dataLines.join('\r\n') + '}') as { data: [{ code: CardType; name: string }] }
      return json.data.map((it) => it.code)
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
      const json = JSON.parse('{' + dataLines.join('\r\n') + '}')
      delete json.technologyCardType
      return json as TechnologyCardUpdateIntermediateParams
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

  const prefix = `oldValues['${code}'] = `
  const suffix = ';'
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith(prefix)) {
      const value = line.substr(prefix.length, line.length - prefix.length - suffix.length).trim()
      const cardType = JSON.parse(value) as string
      if (cardType === 'intermediate') {
        return null
      }
      return cardType as CardType
    }
  }

  return null
}

async function requestApiWithJsonResponseAsync<T>(
  auth: BrsAuth,
  uri: string,
  options?: RequestOptions,
  headers?: RequestHeaders,
): Promise<T> {
  const response = await requestApiAsync(auth, uri, options, headers)
  if (response.headers.get('Content-Type')?.startsWith('application/json')) {
    const json = await response.json()
    return json as T
  } else {
    const text = await response.text()
    console.log(text)
  }
  throw new Error(uri + ' is Forbidden')
}

async function requestApiWithTextResponseAsync(
  auth: BrsAuth,
  uri: string,
  options?: RequestOptions,
  headers?: RequestHeaders,
): Promise<string> {
  const response = await requestApiAsync(auth, uri, options, headers)
  return await response.text()
}

async function requestApiAsync(
  auth: BrsAuth,
  uri: string,
  options?: RequestOptions,
  headers?: RequestHeaders,
): Promise<Response> {
  const url = baseUrl + uri
  const timeout = 30000
  try {
    const response = await fetch(url, {
      method: 'GET',
      ...options,
      headers: {
        Cookie: `JSESSIONID=${auth.sid}`,
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
  body?: object | string
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
  availableCardTypes: CardType[]
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
