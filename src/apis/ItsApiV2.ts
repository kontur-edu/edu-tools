import fetch, { Response } from 'node-fetch'
const baseUrl = 'https://its.urfu.ru'

export class ItsAuthV2 {
  sessionInfo: string
  itsAuth: string

  constructor(sessionInfo: string, itsAuth: string) {
    this.sessionInfo = sessionInfo
    this.itsAuth = itsAuth
  }
}

export class ItsApiV2 {
  auth: ItsAuthV2

  constructor(auth: ItsAuthV2) {
    this.auth = auth
  }

  async getProjectListAsync(
    years: Array<number> /*2023*/,
    semesters: Array<number> /*2*/,
    courses: Array<number> /*2*/,
  ): Promise<Collection<Project>> {
    const filterParams = [
      { property: 'Title', value: '' },
      { property: 'ProfileCodes', value: [] },
      { property: 'ROPs', value: [] },
      { property: 'Years', value: years },
      { property: 'Semesters', value: semesters },
      { property: 'Courses', value: courses },
      { property: 'EducationTypes', value: [] },
      { property: 'ProjectType', value: [] },
      { property: 'ProjectId', value: '' },
    ]
    const filter = encodeURI(JSON.stringify(filterParams))

    const page = 1
    const start = 0
    const limit = 300
    const queryString = `?filter=${filter}&page=${page}&start=${start}&limit=${limit}`

    const response = await fetchApiAsync(
      this.auth,
      '/ProjectList' + queryString,
      {},
      { 'X-Requested-With': 'XMLHttpRequest' },
    )
    return (await response.json()) as Collection<Project>
  }

  async getProjectSubgroupsAsync(projectPeriodId: number): Promise<Array<ProjectSubgroup>> {
    const page = 1
    const start = 0
    const limit = 25 // NOTE: ни на что не влияет
    const queryString = `?projectPeriodId=${projectPeriodId}&page=${page}&start=${start}&limit=${limit}`

    const response = await fetchApiAsync(
      this.auth,
      '/ProjectSubgroupsList' + queryString,
      {},
      { 'X-Requested-With': 'XMLHttpRequest' },
    )
    return (await response.json()) as Array<ProjectSubgroup>
  }

  async getProjectSubgroupStudentsAsync(
    projectPeriodId: number,
    projectProgramId: number,
    subgroupInnerNumber: number,
  ): Promise<Collection<StudentInProjectSubgroup>> {
    const queryString = `?projectPeriodId=${projectPeriodId}&projectProgramId=${projectProgramId}&subgroupInnerNumber=${subgroupInnerNumber}`

    const response = await fetchApiAsync(
      this.auth,
      '/ProjectSubgroupStudentsList/Index' + queryString,
      {},
      { 'X-Requested-With': 'XMLHttpRequest' },
    )
    return (await response.json()) as Collection<StudentInProjectSubgroup>
  }

  async signStudentToProjectSubgroup(studentId: string, subgroupId: number, sign: boolean): Promise<boolean> {
    const body = `sign=${encodeURIComponent(sign)}&studentId=${studentId}&subgroupId=${subgroupId}`

    const response = await fetchApiAsync(
      this.auth,
      `/ProjectSubgroupStudentsList/AddStudentToSubgroup`,
      {
        method: 'PUT',
        body,
      },
      {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    )
    return response.status === 200
  }
}

async function fetchApiAsync(
  auth: ItsAuthV2,
  uri: string,
  maybeOptions?: RequestOptions,
  maybeHeaders?: RequestHeaders,
  maybeCookies?: RequestCookies,
): Promise<Response> {
  const options = maybeOptions || {}

  const headers = maybeHeaders || {}

  const cookies = maybeCookies || {}
  cookies['ItsAuth'] = auth.itsAuth
  cookies['sessionInfo'] = auth.sessionInfo

  const cookieHeader = Object.keys(cookies)
    .map((k) => `${k}=${cookies[k]}`)
    .join('; ')

  const response = await fetch(baseUrl + uri, {
    method: 'GET',
    ...options,
    headers: {
      Cookie: cookieHeader,
      ...headers,
    },
  })
  return response
}

interface RequestOptions {
  method?: string
  body?: string | null
}

interface RequestHeaders {
  'Content-Type'?: string
  'X-Requested-With'?: 'XMLHttpRequest'
}

interface RequestCookies {
  [name: string]: string
}

export interface Project {
  PeriodId: number // 11421
  Id: string // '9484e9e404de46819de2e1293f1833c7'
  ProjectType: string // 'моно'
  SelectionDate: string // 'с 15.02.24 00:00 \nпо 22.02.24 23:59'
  YearAndSemester: string // '2023/2024, Весенний'
  ProfileCodes: string // '02.03.02/33.01'
  Courses: string // '2, 3, 4'
  EducationTypes: string // 'Очная'
  Title: string // 'Индивидуальный проект'
  ROPs: string // '*Домашних И.А.'
  StudentsCount: number // 9
  SignedStudentsCount: number // 9
  Status: string // 'Запись завершена'
  ShowInLC: boolean // true
  Company: string // 'ФГАОУ ВО «УрФУ имени первого Президента России Б.Н. Ельцина»'
}

export interface ProjectSubgroup {
  Index: number // 1
  ProfileCodes: string // '02.03.02/33.01'
  Title: string // 'Программный продукт'
  Year: number // 2023
  ShowInLC: boolean // true
  Accepted: boolean // false
  StudentsCount: number // 0
  Limit: number // 5
  EnrollmentStatus: string // 'Запись завершена'
  Teacher: string // 'Домашних И.А.'
  ProjectProgramId: number // 12168
  SubgroupIds: Array<number> // [69398]
}

export interface StudentInProjectSubgroup {
  Id: string // 'studen195e3pg0000o599qo6tt7cq72s'
  ProfileCode: string // '02.03.02/33.01'
  GroupName: string // 'МЕН-220801'
  FIO: string // 'Александров Никита Артемович'
  Status: string // 'Активный'
  SubgroupId: number // 69416 (этот идентификатор указывает относительно какой подгруппы рассматривается студент)
  Signed: boolean // false или true
  SignDate: string | null // null или "26.03.24"
  SignedBy: string | null // null или "Домашних Иван Алексеевич "
  AnotherProjectName: string | null // null или "Программный продукт"
}

interface Collection<T> {
  data: Array<T>
  total: number
}
