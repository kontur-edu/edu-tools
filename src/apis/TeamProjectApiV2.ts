import JustDate from '../helpers/JustDate.js'
import fetch, { Response } from 'node-fetch'
const baseUrl = 'https://teamproject.urfu.ru/api/v2'

export class TeamProjectAuthV2 {
  authJwt: string

  constructor(authJwt: string) {
    this.authJwt = authJwt
  }
}

export class TeamProjectApiV2 {
  auth: TeamProjectAuthV2

  constructor(auth: TeamProjectAuthV2) {
    this.auth = auth
  }

  async getWorkspacesAsync(
    status: WorkspaceStatus,
    year: number,
    semester: Semester,
    pageNumber: number,
    pageSize: number,
  ): Promise<Workspaces> {
    const url = `/workspaces?status=${status}&year=${year}&semester=${semester}&page=${pageNumber}&size=${pageSize}`
    const response = await fetchApiAsJsonAsync<Workspaces>(this.auth, url)
    return response
  }

  async getIterationsAsync(workspaceId: string): Promise<Array<IterationItem>> {
    const url = `/workspaces/${workspaceId}/iterations`
    const response = await fetchApiAsJsonAsync<Array<IterationItem>>(this.auth, url)
    return response
  }

  async getIterationAsync(iterationId: number): Promise<Iteration> {
    const url = `/iterations/${iterationId}`
    const response = await fetchApiAsJsonAsync<Iteration>(this.auth, url)
    return response
  }

  async postIterationAsync(
    workspaceId: string,
    title: string,
    description: string,
    dateBegin: JustDate,
    dateEnd: JustDate,
  ): Promise<object> {
    const body: IterationPost = {
      title,
      description: description,
      beginning: dateBegin.toDashedString(),
      ending: dateEnd.toDashedString(),
    }
    const url = `/workspaces/${workspaceId}/iterations`
    const response = await fetchApiWithBodyAsJsonAsync<object>(this.auth, 'POST', url, body)
    return response
  }

  async putIterationAsync(
    iterationId: number,
    title: string,
    description: string | null,
    dateBegin: JustDate,
    dateEnd: JustDate,
  ): Promise<object> {
    const body: IterationPut = {
      id: iterationId,
      title: title,
      description: description,
      beginning: dateBegin.toDashedString(),
      ending: dateEnd.toDashedString(),
    }
    const url = `/iterations/${iterationId}`
    const response = await fetchApiWithBodyAsJsonAsync<object>(this.auth, 'PUT', url, body)
    return response
  }
}

async function fetchApiWithBodyAsJsonAsync<T>(
  auth: TeamProjectAuthV2,
  method: HttpMethod,
  uri: string,
  body: object,
): Promise<T> {
  const response = await fetchApiAsJsonAsync<T>(
    auth,
    uri,
    {
      method: method,
      body: JSON.stringify(body),
    },
    {
      'Content-Type': 'application/json',
    },
  )
  return response
}

async function fetchApiAsJsonAsync<T>(
  auth: TeamProjectAuthV2,
  uri: string,
  maybeOptions?: RequestOptions,
  maybeHeaders?: RequestHeaders,
  maybeCookies?: RequestCookies,
): Promise<T> {
  const response = await fetchApiAsync(auth, uri, maybeOptions, maybeHeaders, maybeCookies)
  // const text = await response.text()
  // if (text.trimLeft().startsWith('<!DOCTYPE html>')) {
  //   throw new Error(uri + ' is Forbidden')
  // }
  return (await response.json()) as T
}

async function fetchApiAsync(
  auth: TeamProjectAuthV2,
  uri: string,
  maybeOptions?: RequestOptions,
  maybeHeaders?: RequestHeaders,
  maybeCookies?: RequestCookies,
): Promise<Response> {
  const options = maybeOptions || {}

  const headers = maybeHeaders || {}
  headers['Authorization'] = auth.authJwt.startsWith('Bearer ') ? auth.authJwt : 'Bearer ' + auth.authJwt

  const cookies = maybeCookies || {}

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
  body?: object | string
  json?: boolean
  simple?: boolean
  resolveWithFullResponse?: boolean
}

interface RequestHeaders {
  Authorization?: string
  'Content-Type'?: string
  'X-Requested-With'?: 'XMLHttpRequest'
}

interface RequestCookies {
  [name: string]: string
}

export interface Workspaces {
  items: Array<Workspace>
  total: number
}

export interface Workspace {
  id: string
  isActive: boolean
  projectKind: ProjectKind
  instanceNumber: number
  passportNumber: string
  title: string
  customerOrganizationName: string
  numberOfIterations: number
  mainCurator: Curator
  students: Array<Student>
  currentIteration: null
}

export interface Curator {
  fullname: string
  avatarUrl: string | null
  isExternal: boolean
}

export interface Student {
  fullname: string
  avatarUrl: string | null
  role: string | null
}

export interface IterationPost {
  title: string
  description: string | null
  beginning: string // "2023-10-30"
  ending: string // "2023-11-12"
}

export interface IterationPut {
  id: number
  title: string
  description: string | null
  beginning: string // "2023-10-30"
  ending: string // "2023-11-12"
}

export interface IterationItem {
  id: number
  title: string
}

export interface Iteration {
  id: number
  title: string
  description: string | null
  dates: IterationDates
  canChange: boolean
  canDelete: boolean
  canCreateTask: boolean
}

export interface IterationDates {
  beginning: string // "2023-10-30"
  ending: string // "2023-11-12"
}

type ProjectKind = 'MONOPROGRAM'

type WorkspaceStatus = 'active'

type Semester = 1 | 2

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'
