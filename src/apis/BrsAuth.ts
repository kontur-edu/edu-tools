import { BrsUrlProvider } from './BrsUrlProvider'

export class BrsAuth {
  sid: string

  constructor(sid: string) {
    this.sid = sid
  }

  static async createAsync(urlProvider: BrsUrlProvider, login: string, password: string): Promise<BrsAuth | null> {
    const sid = await authorizeAsync(urlProvider, login, password)
    return sid ? new BrsAuth(sid) : null
  }
}

async function authorizeAsync(urlProvider: BrsUrlProvider, login: string, password: string): Promise<string | null> {
  const timeout = 180000
  const response = await fetch(urlProvider.baseUrl + `/mrd/login`, {
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
