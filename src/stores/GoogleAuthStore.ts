import { create, StoreApi } from 'zustand'
import { combine } from 'zustand/middleware'
import { BrowserCache, StorageType } from '../helpers/BrowserCache';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface UserInfo {
  email: string;
  name: string;
  picture: string;
}

const initialState = {
  isAuthenticated: false,
  userInfo: null as UserInfo | null,
  token: null as TokenResponse | null,
}

function createActions(set: StoreApi<typeof initialState>['setState'], get: StoreApi<typeof initialState>['getState']) {

  function setAuth(token: TokenResponse) {
    BrowserCache.save('google_token', token, StorageType.LocalAndSession)
    set({ isAuthenticated: true, token });
  }

  function clearAuth() {
    BrowserCache.clear('google_token', StorageType.LocalAndSession)
    set({ isAuthenticated: false, userInfo: null, token: null });
  }

  async function loadUserInfoAsync() {
    const { token } = get()
    if (!token) {
      return false
    }

    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      })
      const data = await res.json()
      set({ userInfo: {
        email: data.email,
        name: data.name,
        picture: data.picture,
      }});
      return true
    } catch (error) {
      console.error('Ошибка загрузки информации о пользователе:', error)
      return false
    }
  }

  async function tryLoginFromCacheAsync(): Promise<boolean> {
    const token = BrowserCache.read('google_token', StorageType.LocalAndSession)
    if (!!token) {
      const success = await loadUserInfoAsync()
      if (success) {
        set({
          isAuthenticated: true,
          token: token as TokenResponse,
        })
        return true
      }
    }
    return false
  }

  return { setAuth, clearAuth, loadUserInfoAsync, tryLoginFromCacheAsync };
}

export const useGoogleAuthStore = create(combine(initialState, createActions));
