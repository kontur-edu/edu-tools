import React from 'react'
import { useGoogleStore } from '../../stores/GoogleStore'
import { GoogleAuthButton } from './GoogleAuthButton'
import { GoogleAuthUserInfo } from './GoogleAuthUserInfo'

export function GoogleAuthPanel() {
  const { isAuthenticated } = useGoogleStore()
  return isAuthenticated ? <GoogleAuthUserInfo /> : <GoogleAuthButton />
}
