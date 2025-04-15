import React from 'react'
import { FormEvent, useEffect, useState } from 'react'
import {
  CircularProgress,
  DialogActions,
  Button,
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
  TextField,
} from '@mui/material'
import { useTeamProjectStore } from '../../stores/TeamProjectStore'

export function TeamProjectAuthDialog() {
  const TEAM_PROJECT_AUTH_FILL_INSTRUCTIONS =
    'https://docs.google.com/document/d/1btXePo-5bE8RyX7RFXnBuS-UN9SmwUithpc_UXhAWsg/edit'
  const TEAM_PROJECT_URL = 'https://teamproject.urfu.ru/'

  const isLoggingIn = useTeamProjectStore((state) => state.isLoggingIn)
  const loginAsync = useTeamProjectStore((state) => state.loginAsync)
  const finishLoginAsync = useTeamProjectStore((state) => state.finishLoginAsync)

  const [authJwt, setAuthJwt] = useState('')
  const [dialogErrorText, setDialogErrorText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const isDialogSubmitDisabled = !authJwt || isLoading

  const isDialogOpened = isLoggingIn

  useEffect(() => {
    setDialogErrorText('')
    if (!isLoggingIn) {
      setAuthJwt('')
    }
  }, [isLoggingIn])

  const handeDialogSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setIsLoading(true)
    loginAsync(authJwt).then((result) => {
      setIsLoading(false)
      if (result) {
        finishLoginAsync()
      } else {
        setDialogErrorText('Ошибка при входе в TeamProject')
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
        <DialogTitle>Вход в TeamProject</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="JWT-токен"
            fullWidth
            value={authJwt}
            onChange={(e) => setAuthJwt(e.target.value)}
            disabled={isLoading}
          />
          <Box sx={{ mt: 2 }}>
            <Link href={TEAM_PROJECT_AUTH_FILL_INSTRUCTIONS} target="_blank" rel="noopener noreferrer">
              Как заполнить эту форму?
            </Link>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Link href={TEAM_PROJECT_URL} target="_blank" rel="noopener noreferrer">
              Перейти в TeamProject
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
