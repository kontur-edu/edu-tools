import { ItsApiV2, ItsAuthV2 } from "../apis/ItsApiV2";
import { ItsUrlProvider } from "../apis/ItsUrlProvider";
import LocalEvent from "../helpers/LocalEvent";
import { BrowserCache, StorageType } from "../helpers/BrowserCache";

export class ItsController {
  private readonly urlProvider: ItsUrlProvider
  private currentAuth: ItsAuthV2 | null = null
  private autoCheckAuthTimeout: any
  onAuthChanged: LocalEvent = new LocalEvent()
  
  isLoggingIn: boolean
  onIsLoggingInChanged: LocalEvent = new LocalEvent()
  setIsLoggingIn(value: boolean) {
    this.isLoggingIn = value
    this.onIsLoggingInChanged.emit(value)
  }
  
  isLoggingOut: boolean
  onIsLoggingOutChanged: LocalEvent = new LocalEvent()
  setIsLoggingOut(value: boolean) {
    this.isLoggingOut = value
    this.onIsLoggingOutChanged.emit(value)
  }

  constructor(urlProvider: ItsUrlProvider) {
    this.urlProvider = urlProvider;
    this.isLoggingIn = false
    this.isLoggingOut = false
  }

  getApi(): ItsApiV2 | null {
    if (this.currentAuth === null) {
      return null
    }
    return new ItsApiV2(this.currentAuth, this.urlProvider)
  }

  isLoggedIn(): boolean {
    return this.currentAuth !== null
  }

  async startLoginAsync() {
    if (this.isLoggingOut) {
      return
    }

    this.setIsLoggingIn(true)
  }

  async logInAsync(sessionInfo: string, itsAuth: string): Promise<boolean> {
    const auth = new ItsAuthV2(sessionInfo, itsAuth)
    const result = await this.checkAuthAsync(auth)
    if (result) {
      this.currentAuth = auth
      this.onAuthChanged.emit(true)
      BrowserCache.save('itsAuth', auth, StorageType.LocalAndSession)
      return true
    } else {
      return false
    }
  }

  async tryLogInFromCacheAsync(): Promise<boolean> {
    const auth = BrowserCache.read<ItsAuthV2>('itsAuth', StorageType.LocalAndSession)
    if (auth) {
      return this.logInAsync(auth.sessionInfo, auth.itsAuth)
    }
    return false
  }

  async finishLoginAsync() {
    this.setIsLoggingIn(false)
  }

  async startLogoutAsync() {
    if (this.isLoggingIn) {
      return
    }

    try {
      this.setIsLoggingOut(true)
      await this.logOutAsync()
    } finally {
      this.setIsLoggingOut(false)
    }
  }

  async logOutAsync(): Promise<boolean> {
    const result = this.currentAuth !== null;
    this.currentAuth = null
    this.onAuthChanged.emit(false)
    BrowserCache.clear('itsAuth', StorageType.LocalAndSession)
    return result
  }

  async ensureAuthAsync(): Promise<boolean> {
    if (this.currentAuth === null) {
      return false
    }
    const result = await this.checkAuthAsync(this.currentAuth);
    if (!result) {
      await this.logOutAsync()
    }
    return result
  }

  private async checkAuthAsync(auth: ItsAuthV2): Promise<boolean> {
    const api = new ItsApiV2(auth, this.urlProvider);
    try {
      await api.getProjectListAsync([], [], [])
    } catch (error) {
      return false
    }
    return true
  }

  runAutoEnsureAuth(): void {
    if (this.autoCheckAuthTimeout) {
      clearTimeout(this.autoCheckAuthTimeout);
    }

    this.autoCheckAuthTimeout = setTimeout(async () => {
      await this.ensureAuthAsync()
    }, 60 * 1000)
  }

  stopAutoEnsureAuth(): void {
    if (this.autoCheckAuthTimeout) {
      clearTimeout(this.autoCheckAuthTimeout);
    }
  }
}
