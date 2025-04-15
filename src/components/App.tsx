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
import { BrowserGoogleApi } from '../apis/BrowserGoogleApi'
import { useGoogleAuthStore } from '../stores/GoogleAuthStore'
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
  
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('')
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const { token } = useGoogleAuthStore()

  const handleDialogSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setData(null)
    
    try {
      // Извлекаем ID таблицы из URL
      const spreadsheetId = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]
      if (!spreadsheetId) {
        throw new Error('Неверный формат ссылки на таблицу')
      }

      if (!token) {
        throw new Error('Требуется авторизация')
      }

      const googleApi = new BrowserGoogleApi(token.access_token)
      const spreadsheet = googleApi.openSpreadsheet(spreadsheetId)
      const meta = await spreadsheet.getMetaAsync()
      console.log(meta)
      setData(meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла неизвестная ошибка')
    } finally {
      setIsLoading(false)
    }
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
            value={spreadsheetUrl}
            onChange={(e) => setSpreadsheetUrl(e.target.value)}
          />
          <Button variant="contained" color="primary" type="submit" disabled={isLoading}>
            Загрузить
          </Button>
        </Box>
        {error && (
          <Box sx={{ mt: 2, color: 'error.main' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'center', mt: 4 }}>
          {isLoading && <CircularProgress color="primary" size={150} className="progress" />}
        </Box>
        {data && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Данные успешно загружены</Typography>
          </Box>
        )}
      </form>
    </>
  )
}
