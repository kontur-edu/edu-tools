export class PartnerAuth {
  key: string

  constructor(cookie: string) {
    const parts = cookie.split(';')
    if (parts.length === 1 && parts[0].indexOf('=') < 0) {
      this.key = cookie
    } else {
      const kvs = parts.map((p) => p.split('=').map((x) => x.trim()))
      const parsedCookie = {} as { [k: string]: string }
      for (const kv of kvs) {
        parsedCookie[kv[0]] = kv[1]
      }
      this.key = parsedCookie['key']
    }
  }
}
