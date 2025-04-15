import * as React from 'react'
import {
  Container,
  Typography,
  Box,
} from '@mui/material'
import { GoogleAuthPanel } from './GoogleAuth/GoogleAuthPanel'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ItsAuthSwitch } from './ItsAuth/ItsAuthSwitch'
import { ItsAuthDialog } from './ItsAuth/ItsAuthDialog'
import { GoogleAuthButton } from './GoogleAuth/GoogleAuthButton'
import { ShowIfGoogleAuth } from './GoogleAuth/ShowIfGoogleAuth'
import { TeamProjectAuthSwitch } from './TeamProjectAuth/TeamProjectAuthSwitch'
import { TeamProjectAuthDialog } from './TeamProjectAuth/TeamProjectAuthDialog'
import { BrsAuthSwitch } from './BrsAuth/BrsAuthSwitch'
import { BrsAuthDialog } from './BrsAuth/BrsAuthDialog'
import { PartnerAuthSwitch } from './PartnerAuth/PartnerAuthSwitch'
import { PartnerAuthDialog } from './PartnerAuth/PartnerAuthDialog'
const GOOGLE_CLIENT_ID = "122993083593-pacve8csj86voko30ia65raeg0ncrtuv.apps.googleusercontent.com"

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || ''}>
      <BrowserRouter>
        <Container maxWidth="sm">
          <Box sx={{ my: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
              <Typography variant="h4" component="h1">
                EduTools
              </Typography>
              <GoogleAuthPanel />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
              <BrsAuthSwitch />
              <BrsAuthDialog />
              <PartnerAuthSwitch />
              <PartnerAuthDialog />
              <ItsAuthSwitch />
              <ItsAuthDialog />
              <TeamProjectAuthSwitch />
              <TeamProjectAuthDialog />
            </Box>
            <Routes>
              <Route path="/" element={
                <>
                  <ShowIfGoogleAuth is={false}>
                    <GoogleAuthButton />
                  </ShowIfGoogleAuth>
                </>
              } />
            </Routes>
          </Box>
        </Container>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}
