export class ItsAuth {
  sessionInfo: string
  itsAuth: string

  constructor(sessionInfo: string, itsAuth: string) {
    this.sessionInfo = sessionInfo
    this.itsAuth = itsAuth
  }
}
