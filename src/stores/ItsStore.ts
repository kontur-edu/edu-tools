import { create, StoreApi } from "zustand"
import { combine } from 'zustand/middleware'
import { ItsApiV2 } from "../apis/ItsApiV2"
import { ItsAuthV2 } from "../apis/ItsAuthV2"
import { ItsUrlProvider } from "../apis/ItsUrlProvider"
import { BrowserCache, StorageType } from "../helpers/BrowserCache"

const initialState = {
  currentAuth: null as ItsAuthV2 | null,
  isLoggingIn: false,
  isLoggingOut: false,
  autoCheckAuthTimeout: null as NodeJS.Timeout | null,
  urlProvider: new ItsUrlProvider(true),
}

function createActions(set: StoreApi<typeof initialState>['setState'], get: StoreApi<typeof initialState>['getState']) {

  function startLoginAsync() {
    const { isLoggingOut } = get()
    if (isLoggingOut) {
      return
    }
    set({ isLoggingIn: true })
  }

  function finishLoginAsync() {
    set({ isLoggingIn: false })
  }

  function startLogoutAsync() {
    const { isLoggingIn } = get()
    if (isLoggingIn) {
      return
    }
    try {
      set({ isLoggingOut: true })
      logoutAsync()
    } finally {
      set({ isLoggingOut: false })
    }
  }

  async function loginAsync(sessionInfo: string, itsAuth: string): Promise<boolean> {
    const auth = new ItsAuthV2(sessionInfo, itsAuth)
    const { urlProvider } = get()
    const result = await checkAuthAsync(urlProvider, auth)
    if (result) {
      set({ currentAuth: auth })
      BrowserCache.save('itsAuth', auth, StorageType.LocalAndSession)
      return true
    } else {
      return false
    }
  }

  async function tryLoginFromCacheAsync(): Promise<boolean> {
    const auth = BrowserCache.read<ItsAuthV2>('itsAuth', StorageType.LocalAndSession)
    if (auth) {
      return loginAsync(auth.sessionInfo, auth.itsAuth)
    }
    return false
  }

  async function logoutAsync(): Promise<boolean> {
    const result = get().currentAuth !== null;
    set({ currentAuth: null })
    BrowserCache.clear('itsAuth', StorageType.LocalAndSession)
    return result
  }

  async function ensureAuthAsync(): Promise<boolean> {
    const { currentAuth, urlProvider } = get()
    if (currentAuth === null) {
      return false
    }
    const result = await checkAuthAsync(urlProvider, currentAuth);
    if (!result) {
      await logoutAsync()
    }
    return result
  }

  function runAutoEnsureAuth() {
    const { autoCheckAuthTimeout } = get()
    if (autoCheckAuthTimeout) {
      clearTimeout(autoCheckAuthTimeout);
      set({ autoCheckAuthTimeout: null })
    }

    const timeout = setTimeout(async () => {
      await ensureAuthAsync()
    }, 5 * 60 * 1000)
    set({ autoCheckAuthTimeout: timeout })
  }

  function stopAutoEnsureAuth() {
    const { autoCheckAuthTimeout } = get()
    if (autoCheckAuthTimeout) {
      clearTimeout(autoCheckAuthTimeout);
      set({ autoCheckAuthTimeout: null })
    }
  }

  function getApi(): ItsApiV2 | null {
    const { currentAuth, urlProvider } = get()
    if (currentAuth === null) {
      return null
    }
    return new ItsApiV2(currentAuth, urlProvider)
  }

  return ({
    startLoginAsync,
    finishLoginAsync,
    startLogoutAsync,
    loginAsync,
    tryLoginFromCacheAsync,
    logoutAsync,
    ensureAuthAsync,
    runAutoEnsureAuth,
    stopAutoEnsureAuth,
    getApi,
  })
}

async function checkAuthAsync(urlProvider: ItsUrlProvider, auth: ItsAuthV2): Promise<boolean> {
  const api = new ItsApiV2(auth, urlProvider);
  try {
    await api.getProjectListAsync([], [], [])
  } catch (error) {
    return false
  }
  return true
}

export const useItsStore = create(combine(initialState, createActions))
