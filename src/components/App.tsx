import * as React from 'react'
import { Container, Typography, Box, TextField, Button, CircularProgress } from '@mui/material'
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
import { useState } from 'react'
const GOOGLE_CLIENT_ID = '122993083593-pacve8csj86voko30ia65raeg0ncrtuv.apps.googleusercontent.com'

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || ''}>
      <BrowserRouter>
        <Container maxWidth="md">
          <Box sx={{ my: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4" component="h1">
                EduTools
              </Typography>
              <GoogleAuthPanel />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
              <Route
                path="/"
                element={
                  <>
                    <ShowIfGoogleAuth is={false}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          width: '100%',
                          padding: 4,
                          border: '2px dashed grey',
                        }}
                      >
                        <GoogleAuthButton />
                      </Box>
                    </ShowIfGoogleAuth>
                    <ShowIfGoogleAuth is={true}>
                      <SpreadsheetForm />
                    </ShowIfGoogleAuth>
                  </>
                }
              />
            </Routes>
          </Box>
        </Container>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}

function SpreadsheetForm() {
  const [isLoading, setIsLoading] = useState(false)

  const handleDialogSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    // Здесь будет логика обработки формы
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
        <Typography variant="h6" component="h2">
          Вставьте ссылку на лист Google Таблицы с заданием
        </Typography>
      </Box>
      <form onSubmit={handleDialogSubmit}>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <TextField
            fullWidth
            variant="standard"
            placeholder="Ссылка вида https://docs.google.com/spreadsheets/d/sjwa1/edit#gid=0"
            sx={{ mr: 2 }}
            required
          />
          <Button variant="contained" color="primary" type="submit" disabled={isLoading}>
            Загрузить
          </Button>
        </Box>
        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'center', mt: 4 }}>
          {isLoading && <CircularProgress color="primary" size={150} className="progress" />}
        </Box>
      </form>
    </>
  )
}
