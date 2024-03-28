import fetch from 'node-fetch'
import * as fs from 'fs'
const baseUrl = 'https://brs.urfu.ru'

export class BrsAuth {
  sid: string
  login: string

  constructor(sid: string, login: string) {
    this.sid = sid
    this.login = login
  }

  static async createAsync(login: string, password: string): Promise<BrsAuth | null> {
    const sid = await authorizeAsync(login, password)
    return sid ? new BrsAuth(sid, login) : null
  }

  static async createByConfigAsync(secretName: string): Promise<BrsAuth | null> {
    const secrets = JSON.parse(fs.readFileSync('./secrets/brs.json', 'utf8'))
    const credentials = secrets[secretName] as {
      login: string
      password: string
      sid: string // содержимое Cookie JSSESSIONID, если sid задается, то все login и password не используются
    }

    const sid = credentials.sid ? credentials.sid : await authorizeAsync(credentials.login, credentials.password)
    const login = credentials.sid ? secretName : credentials.login
    return sid ? new BrsAuth(sid, login) : null
  }
}

async function authorizeAsync(login: string, password: string): Promise<string | null> {
  const timeout = 30000
  const response = await fetch(baseUrl + `/mrd/login`, {
    method: 'POST',
    body: `username=${login}&password=${password}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    signal: AbortSignal.timeout(timeout),
  })

  for (const entry of response.headers.entries()) {
    if (entry[0] === 'set-cookie' && entry[1].startsWith('JSESSIONID=')) {
      const sessionCookie = entry[1]
      const sid = sessionCookie.split(';')[0].substr('JSESSIONID='.length).trim()
      return sid
    }
  }

  return null
}
