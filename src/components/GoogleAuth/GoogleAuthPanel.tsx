import React from 'react'
import { useGoogleAuthStore } from '../../stores/GoogleAuthStore'
import { GoogleAuthButton } from './GoogleAuthButton'
import { GoogleAuthUserInfo } from './GoogleAuthUserInfo'

export function GoogleAuthPanel() {
  const { isAuthenticated } = useGoogleAuthStore()
  return isAuthenticated ? <GoogleAuthUserInfo /> : <GoogleAuthButton />
}
