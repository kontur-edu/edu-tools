export class ItsAuthV2 {
  sessionInfo: string
  itsAuth: string

  constructor(sessionInfo: string, itsAuth: string) {
    this.sessionInfo = sessionInfo
    this.itsAuth = itsAuth
  }
}
