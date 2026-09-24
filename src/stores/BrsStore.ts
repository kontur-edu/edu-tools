import { create, StoreApi } from "zustand"
import { combine } from 'zustand/middleware'
import { BrsApi } from "../apis/BrsApi"
import { BrsUrlProvider } from "../apis/BrsUrlProvider"
import { BrsAuth } from "../apis/BrsAuth"
import { BrowserCache, StorageType } from "../helpers/BrowserCache"
import { checkBrsAuthAsync } from "../actions/checkSystemAuthAsync"

const urlProvider = new BrsUrlProvider(true)

const initialState = {
  currentAuth: null as BrsAuth | null,
  isLoggingIn: false,
  isLoggingOut: false,
  autoCheckAuthTimeout: null as NodeJS.Timeout | null,
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

  async function loginAsync(sid: string): Promise<boolean> {
    const auth = new BrsAuth(sid)
    const result = await checkAuthAsync(urlProvider, auth)
    if (result) {
      set({ currentAuth: auth })
      BrowserCache.save('brsAuth', auth, StorageType.LocalAndSession)
      return true
    } else {
      return false
    }
  }

  async function tryLoginFromCacheAsync(): Promise<boolean> {
    const auth = BrowserCache.read<BrsAuth>('brsAuth', StorageType.LocalAndSession)
    if (auth) {
      return loginAsync(auth.sid)
    }
    return false
  }

  async function logoutAsync(): Promise<boolean> {
    const result = get().currentAuth !== null;
    set({ currentAuth: null })
    BrowserCache.clear('brsAuth', StorageType.LocalAndSession)
    return result
  }

  async function ensureAuthAsync(): Promise<boolean> {
    const { currentAuth } = get()
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

  function getApi(): BrsApi | null {
    const { currentAuth } = get()
    if (currentAuth === null) {
      return null
    }
    return new BrsApi(currentAuth, urlProvider)
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

async function checkAuthAsync(urlProvider: BrsUrlProvider, auth: BrsAuth): Promise<boolean> {
  try {
    return await checkBrsAuthAsync(new BrsApi(auth, urlProvider))
  } catch (error) {
    return false
  }
}

export const useBrsStore = create(combine(initialState, createActions))
