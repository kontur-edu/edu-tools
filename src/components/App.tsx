import * as React from 'react'
import {
  Button,
  Switch,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Container,
  Typography,
  Box,
  Link,
  Alert,
  CircularProgress,
} from '@mui/material'

import { FormEvent, useEffect, useState } from 'react'
import { useItsStore } from '../stores/ItsStore'

export default function App() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          EduTools
        </Typography>
        <AuthPanel />
      </Box>
    </Container>
  )
}

export function AuthPanel() {
  return (
    <Box sx={{ my: 4 }}>
      <ItsAuthSwitch />
      <ItsAuthDialog />
    </Box>
  )
}

export function ItsAuthSwitch() {
  const isLoggedIn = useItsStore((state) => state.currentAuth !== null)
  const isLoggingIn = useItsStore((state) => state.isLoggingIn)
  const isLoggingOut = useItsStore((state) => state.isLoggingOut)
  const runAutoEnsureAuth = useItsStore((state) => state.runAutoEnsureAuth)
  const stopAutoEnsureAuth = useItsStore((state) => state.stopAutoEnsureAuth)
  const startLoginAsync = useItsStore((state) => state.startLoginAsync)
  const startLogoutAsync = useItsStore((state) => state.startLogoutAsync)

  const disabled = isLoggingIn || isLoggingOut

  useEffect(() => {
    if (isLoggedIn) {
      runAutoEnsureAuth()
    } else {
      stopAutoEnsureAuth()
    }
  }, [isLoggedIn])

  const handleToggle = () => {
    if (isLoggedIn) {
      startLogoutAsync()
    } else {
      startLoginAsync()
    }
  }

  return (
    <FormControlLabel
      control={<Switch checked={isLoggedIn} onChange={handleToggle} disabled={disabled} />}
      label="ИТС"
    />
  )
}

export function ItsAuthDialog() {
  const ITS_AUTH_FILL_INSTRUCTIONS =
    'https://docs.google.com/document/d/1btXePo-5bE8RyX7RFXnBuS-UN9SmwUithpc_UXhAWsg/edit'
  const ITS_URL = 'https://its.urfu.ru/'

  const isLoggingIn = useItsStore((state) => state.isLoggingIn)
  const logInAsync = useItsStore((state) => state.logInAsync)
  const finishLoginAsync = useItsStore((state) => state.finishLoginAsync)

  const [sessionInfo, setSessionInfo] = useState('')
  const [itsAuth, setItsAuth] = useState('')
  const [dialogErrorText, setDialogErrorText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const isDialogSubmitDisabled = !sessionInfo || !itsAuth || isLoading

  const isDialogOpened = isLoggingIn

  useEffect(() => {
    setDialogErrorText('')
    if (!isLoggingIn) {
      setSessionInfo('')
      setItsAuth('')
    }
  }, [isLoggingIn])

  const handeDialogSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setIsLoading(true)
    logInAsync(sessionInfo, itsAuth).then((result) => {
      setIsLoading(false)
      if (result) {
        finishLoginAsync()
      } else {
        setDialogErrorText('Ошибка при входе в ИТС')
      }
    })
  }

  const handleDialogCancel = () => {
    if (!isLoading) {
      finishLoginAsync()
    }
  }

  return (
    <Dialog open={isDialogOpened} onClose={handleDialogCancel}>
      <form onSubmit={handeDialogSubmit}>
        <DialogTitle>Вход в ИТС</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="sessionInfo"
            fullWidth
            value={sessionInfo}
            onChange={(e) => setSessionInfo(e.target.value)}
            disabled={isLoading}
          />
          <TextField
            margin="dense"
            label="ItsAuth"
            fullWidth
            value={itsAuth}
            onChange={(e) => setItsAuth(e.target.value)}
            disabled={isLoading}
          />
          <Box sx={{ mt: 2 }}>
            <Link href={ITS_AUTH_FILL_INSTRUCTIONS} target="_blank" rel="noopener noreferrer">
              Как заполнить эту форму?
            </Link>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Link href={ITS_URL} target="_blank" rel="noopener noreferrer">
              Перейти в ИТС
            </Link>
          </Box>
          {dialogErrorText && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="error" sx={{ mb: 2 }}>
                {dialogErrorText}
              </Alert>
            </Box>
          )}
          {isLoading && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={isDialogSubmitDisabled} type="submit" variant="contained" color="primary">
            Войти
          </Button>
          <Button onClick={handleDialogCancel} disabled={isLoading}>
            Отмена
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
