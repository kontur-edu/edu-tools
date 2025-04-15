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
import { useBrsStore } from '../../stores/BrsStore'

export function BrsAuthDialog() {
  const BRS_AUTH_FILL_INSTRUCTIONS =
    'https://docs.google.com/document/d/1btXePo-5bE8RyX7RFXnBuS-UN9SmwUithpc_UXhAWsg/edit'
  const BRS_URL = 'https://brs.urfu.ru/'

  const isLoggingIn = useBrsStore((state) => state.isLoggingIn)
  const loginAsync = useBrsStore((state) => state.loginAsync)
  const finishLoginAsync = useBrsStore((state) => state.finishLoginAsync)

  const [sid, setSid] = useState('')
  const [dialogErrorText, setDialogErrorText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const isDialogSubmitDisabled = !sid || isLoading

  const isDialogOpened = isLoggingIn

  useEffect(() => {
    setDialogErrorText('')
    if (!isLoggingIn) {
      setSid('')
    }
  }, [isLoggingIn])

  const handeDialogSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setIsLoading(true)
    loginAsync(sid).then((result) => {
      setIsLoading(false)
      if (result) {
        finishLoginAsync()
      } else {
        setDialogErrorText('Ошибка при входе в БРС')
      }
    })
  }

  const handleDialogCancel = () => {
    if (!isLoading) {
      finishLoginAsync()
    }
  }

  return (
    <Dialog open={isDialogOpened} onClose={handleDialogCancel} maxWidth="xs" fullWidth>
      <form onSubmit={handeDialogSubmit}>
        <DialogTitle>Вход в БРС</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="JSESSIONID"
            fullWidth
            value={sid}
            onChange={(e) => setSid(e.target.value)}
            disabled={isLoading}
          />
          <Box sx={{ mt: 2 }}>
            <Link href={BRS_AUTH_FILL_INSTRUCTIONS} target="_blank" rel="noopener noreferrer">
              Как заполнить эту форму?
            </Link>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Link href={BRS_URL} target="_blank" rel="noopener noreferrer">
              Перейти в БРС
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
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
