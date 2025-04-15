import { create, StoreApi } from "zustand"
import { combine } from 'zustand/middleware'
import { TeamProjectApiV2 } from "../apis/TeamProjectApiV2"
import { TeamProjectUrlProvider } from "../apis/TeamProjectUrlProvider"
import { TeamProjectAuthV2 } from "../apis/TeamProjectAuthV2"
import { BrowserCache, StorageType } from "../helpers/BrowserCache"


const initialState = {
  currentAuth: null as TeamProjectAuthV2 | null,
  isLoggingIn: false,
  isLoggingOut: false,
  autoCheckAuthTimeout: null as NodeJS.Timeout | null,
  urlProvider: new TeamProjectUrlProvider(true),
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

  async function loginAsync(authJwt: string): Promise<boolean> {
    const auth = new TeamProjectAuthV2(authJwt)
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
    const auth = BrowserCache.read<TeamProjectAuthV2>('teamProjectAuth', StorageType.LocalAndSession)
    if (auth) {
      return loginAsync(auth.authJwt)
    }
    return false
  }

  async function logoutAsync(): Promise<boolean> {
    const result = get().currentAuth !== null;
    set({ currentAuth: null })
    BrowserCache.clear('teamProjectAuth', StorageType.LocalAndSession)
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

  function getApi(): TeamProjectApiV2 | null {
    const { currentAuth, urlProvider } = get()
    if (currentAuth === null) {
      return null
    }
    return new TeamProjectApiV2(currentAuth, urlProvider)
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

async function checkAuthAsync(urlProvider: TeamProjectUrlProvider, auth: TeamProjectAuthV2): Promise<boolean> {
  const api = new TeamProjectApiV2(auth, urlProvider);
  try {
    const result = await api.getWorkspacesAsync("active", 2000, 1, 1, 10)
    if (result === null) {
      return false
    }
  } catch (error) {
    return false
  }
  return true
}

export const useTeamProjectStore = create(combine(initialState, createActions))
