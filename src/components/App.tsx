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

import { ItsController } from '../controllers/ItsController'
import { FormEvent, useEffect, useState } from 'react'

export default function App({ itsController }: { itsController: ItsController }) {
  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          EduTools
        </Typography>
        <AuthPanel itsController={itsController} />
      </Box>
    </Container>
  )
}

export function AuthPanel({ itsController }: { itsController: ItsController }) {
  return (
    <Box sx={{ my: 4 }}>
      <ItsAuthSwitch itsController={itsController} />
      <ItsAuthDialog itsController={itsController} />
    </Box>
  )
}

export function ItsAuthSwitch({ itsController }: { itsController: ItsController }) {
  const [disabled, setDisabled] = useState(false)
  const [isAuthEnabled, setIsAuthEnabled] = useState(false)

  const handleIsAuthEnabled = (itsController: ItsController) => {
    if (itsController.isLoggedIn()) {
      setIsAuthEnabled(true)
      itsController.runAutoEnsureAuth()
    } else {
      setIsAuthEnabled(false)
      itsController.stopAutoEnsureAuth()
    }
  }

  const handleIsLoggingInAndOut = (itsController: ItsController) => {
    setDisabled(itsController.isLoggingIn || itsController.isLoggingOut)
  }

  useEffect(() => {
    handleIsAuthEnabled(itsController)
    const unsubscribeAuthChanged = itsController.onAuthChanged.on(() => {
      handleIsAuthEnabled(itsController)
    })

    handleIsLoggingInAndOut(itsController)
    const unsubscribeIsLoggingInChanged = itsController.onIsLoggingInChanged.on(() => {
      handleIsLoggingInAndOut(itsController)
    })
    const unsubscribeIsLoggingOutChanged = itsController.onIsLoggingOutChanged.on(() => {
      handleIsLoggingInAndOut(itsController)
    })

    return () => {
      unsubscribeAuthChanged()
      unsubscribeIsLoggingInChanged()
      unsubscribeIsLoggingOutChanged()
    }
  }, [itsController])

  const handleToggle = () => {
    if (itsController.isLoggedIn()) {
      itsController.startLogoutAsync()
    } else {
      itsController.startLoginAsync()
    }
  }

  return (
    <FormControlLabel
      control={<Switch checked={isAuthEnabled} onChange={handleToggle} disabled={disabled} />}
      label="ИТС"
    />
  )
}

export function ItsAuthDialog({ itsController }: { itsController: ItsController }) {
  const ITS_AUTH_FILL_INSTRUCTIONS =
    'https://docs.google.com/document/d/1btXePo-5bE8RyX7RFXnBuS-UN9SmwUithpc_UXhAWsg/edit'
  const ITS_URL = 'https://its.urfu.ru/'

  const [isDialogOpened, setIsDialogOpened] = useState(false)
  const [sessionInfo, setSessionInfo] = useState('')
  const [itsAuth, setItsAuth] = useState('')
  const [dialogErrorText, setDialogErrorText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const isDialogSubmitDisabled = !sessionInfo || !itsAuth || isLoading

  useEffect(() => {
    setIsLoggingIn(itsController.isLoggingIn)

    const unsubscribeIsLoggingInChanged = itsController.onIsLoggingInChanged.on(() => {
      setIsLoggingIn(itsController.isLoggingIn)
    })

    return () => {
      unsubscribeIsLoggingInChanged()
    }
  }, [itsController])

  function setIsLoggingIn(value: boolean) {
    if (value) {
      setIsDialogOpened(true)
      setDialogErrorText('')
    } else {
      setIsDialogOpened(false)
      setDialogErrorText('')
      setSessionInfo('')
      setItsAuth('')
    }
  }

  const handeDialogSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    handleLogin()
  }

  const handleDialogCancel = () => {
    if (!isLoading) {
      itsController.finishLoginAsync()
    }
  }

  const handleLogin = () => {
    setIsLoading(true)
    itsController.logInAsync(sessionInfo, itsAuth).then((result) => {
      setIsLoading(false)
      if (result) {
        itsController.finishLoginAsync()
      } else {
        setDialogErrorText('Ошибка при входе в ИТС')
      }
    })
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
