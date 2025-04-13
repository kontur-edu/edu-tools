import { create } from "zustand"
import { ItsApiV2, ItsAuthV2 } from "../apis/ItsApiV2"
import { ItsUrlProvider } from "../apis/ItsUrlProvider"
import { BrowserCache, StorageType } from "../helpers/BrowserCache"

export const useItsStore = create<{
  currentAuth: ItsAuthV2 | null
  setCurrentAuth: (currentAuth: ItsAuthV2 | null) => void
  isAuthEnabled: boolean
  setIsAuthEnabled: (isAuthEnabled: boolean) => void
  isLoggingIn: boolean
  setIsLoggingIn: (isLoggingIn: boolean) => void
  isLoggingOut: boolean
  setIsLoggingOut: (isLoggingOut: boolean) => void
  autoCheckAuthTimeout: any | null
  setAutoCheckAuthTimeout: (autoCheckAuthTimeout: any | null) => void
  urlProvider: ItsUrlProvider
}>((set) => ({
  currentAuth: null,
  setCurrentAuth: (currentAuth: ItsAuthV2 | null) => set({ currentAuth }),
  isAuthEnabled: false,
  setIsAuthEnabled: (isAuthEnabled: boolean) => set({ isAuthEnabled }),
  isLoggingIn: false,
  setIsLoggingIn: (isLoggingIn: boolean) => set({ isLoggingIn }),
  isLoggingOut: false,
  setIsLoggingOut: (isLoggingOut: boolean) => set({ isLoggingOut }),
  autoCheckAuthTimeout: null,
  setAutoCheckAuthTimeout: (autoCheckAuthTimeout: any | null) => set({ autoCheckAuthTimeout }),
  urlProvider: new ItsUrlProvider(true),
}))

export function getApi(): ItsApiV2 | null {
  const state = useItsStore.getState()
  if (state.currentAuth === null) {
    return null
  }
  return new ItsApiV2(state.currentAuth, state.urlProvider)
}

export function isLoggedIn(): boolean {
  const state = useItsStore.getState()
  return state.currentAuth !== null
}

export async function startLoginAsync() {
  const state = useItsStore.getState()
  if (state.isLoggingOut) {
    return
  }

  state.setIsLoggingIn(true)
}

export async function logInAsync(sessionInfo: string, itsAuth: string): Promise<boolean> {
  const state = useItsStore.getState()
  const auth = new ItsAuthV2(sessionInfo, itsAuth)
  const result = await checkAuthAsync(auth)
  if (result) {
    state.setCurrentAuth(auth)
    BrowserCache.save('itsAuth', auth, StorageType.LocalAndSession)
    return true
  } else {
    return false
  }
}

export async function tryLogInFromCacheAsync(): Promise<boolean> {
  const auth = BrowserCache.read<ItsAuthV2>('itsAuth', StorageType.LocalAndSession)
  if (auth) {
    return logInAsync(auth.sessionInfo, auth.itsAuth)
  }
  return false
}

export async function finishLoginAsync() {
  const state = useItsStore.getState()
  state.setIsLoggingIn(false)
}

export async function startLogoutAsync() {
  const state = useItsStore.getState()
  if (state.isLoggingIn) {
    return
  }

  try {
    state.setIsLoggingOut(true)
    await logOutAsync()
  } finally {
    state.setIsLoggingOut(false)
  }
}

export async function logOutAsync(): Promise<boolean> {
  const state = useItsStore.getState()
  const result = state.currentAuth !== null;
  state.setCurrentAuth(null);
  BrowserCache.clear('itsAuth', StorageType.LocalAndSession)
  return result
}

export async function ensureAuthAsync(): Promise<boolean> {
  const state = useItsStore.getState()
  if (state.currentAuth === null) {
    return false
  }
  const result = await checkAuthAsync(state.currentAuth);
  if (!result) {
    await logOutAsync()
  }
  return result
}

export async function checkAuthAsync(auth: ItsAuthV2): Promise<boolean> {
  const state = useItsStore.getState()
  const api = new ItsApiV2(auth, state.urlProvider);
  try {
    await api.getProjectListAsync([], [], [])
  } catch (error) {
    return false
  }
  return true
}

export function runAutoEnsureAuth() {
  const state = useItsStore.getState()
  if (state.autoCheckAuthTimeout) {
    clearTimeout(state.autoCheckAuthTimeout);
  }

  state.autoCheckAuthTimeout = setTimeout(async () => {
    await ensureAuthAsync()
  }, 60 * 1000)
}

export function stopAutoEnsureAuth() {
  const state = useItsStore.getState()
  if (state.autoCheckAuthTimeout) {
    clearTimeout(state.autoCheckAuthTimeout);
  }
}
