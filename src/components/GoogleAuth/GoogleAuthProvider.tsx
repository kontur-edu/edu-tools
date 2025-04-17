import { GoogleOAuthProvider } from "@react-oauth/google"
import React from "react"

const GOOGLE_CLIENT_ID = '755135977995-7gngisf462a86mtd7bireuqn1tjqq7tj.apps.googleusercontent.com'

export function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  )
}
