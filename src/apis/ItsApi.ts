import { ItsAuth } from "./ItsAuth"
import { ItsUrlProvider } from "./ItsUrlProvider"

export class ItsApi {
  private readonly auth: ItsAuth
  private readonly urlProvider: ItsUrlProvider

  constructor(auth: ItsAuth, urlProvider: ItsUrlProvider) {
    this.auth = auth
    this.urlProvider = urlProvider
  }

  async getProjectSubgroupsAsync(groupId: string): Promise<Collection<ProjectSubgroup>> {
    const filterParams = [
      { property: 'Year', value: '' },
      { property: 'Semester', value: '' },
      { property: 'ModuleTitle', value: '' },
      { property: 'Name', value: '' },
      { property: 'subgroupType', value: '' },
      { property: 'Limit', value: '' },
      { property: 'count', value: '' },
    ]
    const filter = encodeURI(JSON.stringify(filterParams))

    const groupParams = { property: 'ModuleTitle', direction: 'ASC' }
    const group = encodeURI(JSON.stringify(groupParams))

    const page = 1
    const start = 0
    const limit = 25
    const queryString = `?competitionGroupId=${groupId}&filter=${filter}&group=${group}&page=${page}&start=${start}&limit=${limit}`

    const response = await fetchApiAsync(
      this.urlProvider,
      this.auth,
      '/ProjectSubgroup' + queryString,
      {},
      { 'X-Requested-With': 'XMLHttpRequest' },
    )
    return (await response.json()) as Collection<ProjectSubgroup>;
  }

  async getProjectSubgroupFormAsync(subgroupId: number): Promise<ProjectSubgroupForm> {
    const queryString = `?id=${subgroupId}`

    const response = await fetchApiAsync(this.urlProvider, this.auth, '/ProjectSubgroup/Edit' + queryString)
    const body = await response.text()

    const antiforgery = extractAntiforgery(response)
    const requestVerificationToken = extractRequestVerificationToken(body)
    const id = extractSubgroupId(body)
    const name = extractSubgroupName(body)
    const limit = extractSubgroupLimit(body)
    const teachers = extractSubgroupTeachers(body)

    const selectedTeacher = teachers.filter((it) => it.selected)[0] || null
    const teacherId = selectedTeacher ? selectedTeacher.id : ''

    return {
      id,
      name,
      limit,
      teacherId,
      teachers: teachers.map((it) => ({ id: it.id, caption: it.caption })),
      requestVerificationToken,
      antiforgery,
    }
  }

  async putProjectSubgroupFormAsync(form: ProjectSubgroupForm): Promise<boolean> {
    const body = `Name=${encodeURIComponent(form.name)}&Limit=${form.limit}&TeacherId=${
      form.teacherId
    }&__RequestVerificationToken=${form.requestVerificationToken}`

    const response = await fetchApiAsync(
      this.urlProvider,
      this.auth,
      `/ProjectSubgroup/Edit?id=${form.id}`,
      {
        method: 'POST',
        body,
      },
      {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      {
        '.AspNetCore.Antiforgery.SdfBlYY3_vg': form.antiforgery,
      },
    )
    return response.status === 302 || response.status === 200
  }

  async getStudentsAsync(subgroupId: number, hideStudents: boolean): Promise<Collection<Student>> {
    const page = 1
    const start = 0
    const limit = 25
    const queryString = `?id=${subgroupId}&hideStudents=${hideStudents}&page=${page}&start=${start}&limit=${limit}`

    const response = await fetchApiAsync(
      this.urlProvider,
      this.auth,
      '/ProjectSubgroup/StudentsAjax' + queryString,
      {},
    )
    return (await response.json()) as Collection<Student>;
  }

  async putStudentMembershipAsync(subgroupId: number, studentId: string, include: boolean): Promise<void> {
    const body = `subgroupId=${subgroupId}&studentId=${studentId}&include=${include}`

    await fetchApiAsync(
      this.urlProvider,
      this.auth,
      '/ProjectSubgroup/StudentMembership',
      {
        method: 'POST',
        body,
      },
      {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    )
  }
}

function extractAntiforgery(response: Response): string {
  const antiforgeryPrefix = '.AspNetCore.Antiforgery.SdfBlYY3_vg='
  const antiforgeryCookies: Array<string> = []
  for (const entry of response.headers.entries()) {
    if (entry[0] === 'set-cookie' && entry[1].startsWith(antiforgeryPrefix)) {
      antiforgeryCookies.push(entry[1])
    }
  }
  const antiforgeryCookie = antiforgeryCookies.length > 0 ? antiforgeryCookies[0] : ''
  const antiforgery = antiforgeryCookie.split(';')[0].substring(antiforgeryPrefix.length)
  return antiforgery
}

function extractRequestVerificationToken(body: string): string {
  const verificationTokenMatch = body.match(
    /<input name=\"__RequestVerificationToken\" type=\"hidden\" value=\"([^"]*)\" \/>/,
  )
  const verificationToken = (verificationTokenMatch && verificationTokenMatch[1]) || ''
  return verificationToken
}

function extractSubgroupId(body: string): number {
  const idMatch = body.match(/<input[^>]*name="Id"[^>]*value=\"([^"]*)\"[^>]*>/)
  const id = (idMatch && parseInt(idMatch[1], 10)) || 0
  return id
}

function extractSubgroupName(body: string): string {
  const nameMatch = body.match(/<input[^>]*name="Name"[^>]*value=\"([^"]*)\"[^>]*>/)
  const name = (nameMatch && nameMatch[1]) || ''
  return name
}

function extractSubgroupLimit(body: string): number {
  const limitMatch = body.match(/<input[^>]*name="Limit"[^>]*value=\"([^"]*)\"[^>]*>/)
  const limit = (limitMatch && parseInt(limitMatch[1], 10)) || 0
  return limit
}

function extractSubgroupTeachers(body: string): { selected: boolean; id: string; caption: string }[] {
  const teacherIdSelectMatch = body.match(
    /<select[^>]*id="TeacherId"[^>]*>([\s]*<option[^>]*>[^<]*<\/option>[\s]*)*<\/select>/,
  )
  if (!teacherIdSelectMatch) {
    return []
  }

  const teachers = teacherIdSelectMatch
    .slice(1)
    .map((it) => it.match(/[\s]*<option (selected=\"selected\")?[^>]*value=\"([^"]*)\"[^>]*>([^<]*)<\/option>[\s]*/))
    .filter((it): it is RegExpMatchArray => true)
    .map((it) => ({
      selected: it[1] === 'selected="selected"',
      id: it[it.length - 2],
      caption: it[it.length - 1],
    }))

  return teachers
}

async function fetchApiAsync(
  urlProvider: ItsUrlProvider,
  auth: ItsAuth,
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

  const response = await fetch(urlProvider.baseUrl + uri, {
    method: 'GET',
    ...options,
    headers: urlProvider.prepareHeaders({
      Cookie: cookieHeader,
      ...headers,
    }),
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

export interface ProjectSubgroup {
  Id: number // 19911
  Name: string // 'Компьютерная игра\\экзамен\\9'
  Level: 'А' | 'B' | 'C'
  HasScores: boolean
  moduleId: string // '4f7f489c13914c508d3beb54455a0d58'
  ModuleTitle: string // 'Компьютерная игра'
  Year: string // '2021'
  Semester: 'Весенний' | 'Осенний' // 'Весенний'
  semesterId: number // 2
  subgroupType: string // 'лекции'
  kgmer: string // '1'
  Limit: number // 4
  count: number // 4
  teacher: string // 'Домашних И.А.'
}

interface Student {
  Id: string // 'studen195e3pg0000nmtmebn7661r1gk'
  GroupName: string // 'МЕН-110802'
  Surname: string // 'Абелян'
  Name: string // 'Давид'
  PatronymicName: string // 'Самвелович'
  Status: string // 'Активный'
  Included: boolean
  AnotherGroup: string | null
}

interface ProjectSubgroupForm {
  id: number
  name: string
  limit: number
  teacherId: string
  teachers: { id: string; caption: string }[]
  requestVerificationToken: string
  antiforgery: string
}

interface Collection<T> {
  data: Array<T>
  total: number
}
