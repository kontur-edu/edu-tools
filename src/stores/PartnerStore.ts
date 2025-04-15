import { create, StoreApi } from "zustand"
import { combine } from 'zustand/middleware'
import { PartnerApi } from "../apis/PartnerApi"
import { PartnerUrlProvider } from "../apis/PartnerUrlProvider"
import { PartnerAuth } from "../apis/PartnerAuth"
import { BrowserCache, StorageType } from "../helpers/BrowserCache"

const urlProvider = new PartnerUrlProvider(true)

const initialState = {
  currentAuth: null as PartnerAuth | null,
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

  async function loginAsync(key: string): Promise<boolean> {
    const auth = new PartnerAuth(key)
    const result = await checkAuthAsync(urlProvider, auth)
    if (result) {
      set({ currentAuth: auth })
      BrowserCache.save('partnerAuth', auth, StorageType.LocalAndSession)
      return true
    } else {
      return false
    }
  }

  async function tryLoginFromCacheAsync(): Promise<boolean> {
    const auth = BrowserCache.read<PartnerAuth>('partnerAuth', StorageType.LocalAndSession)
    if (auth) {
      return loginAsync(auth.key)
    }
    return false
  }

  async function logoutAsync(): Promise<boolean> {
    const result = get().currentAuth !== null;
    set({ currentAuth: null })
    BrowserCache.clear('partnerAuth', StorageType.LocalAndSession)
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

  function getApi(): PartnerApi | null {
    const { currentAuth } = get()
    if (currentAuth === null) {
      return null
    }
    return new PartnerApi(currentAuth, urlProvider)
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

async function checkAuthAsync(urlProvider: PartnerUrlProvider, auth: PartnerAuth): Promise<boolean> {
  const api = new PartnerApi(auth, urlProvider);
  try {
    const result = await api.getProjectAsync(26654)
    if (result === null) {
      return false
    }
  } catch (error) {
    return false
  }
  return true
}

export const usePartnerStore = create(combine(initialState, createActions))
