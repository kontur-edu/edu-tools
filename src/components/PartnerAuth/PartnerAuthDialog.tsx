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
import { usePartnerStore } from '../../stores/PartnerStore'

export function PartnerAuthDialog() {
  const PARTNER_AUTH_FILL_INSTRUCTIONS =
    'https://docs.google.com/document/d/1btXePo-5bE8RyX7RFXnBuS-UN9SmwUithpc_UXhAWsg/edit'
  const PARTNER_URL = 'https://partner.urfu.ru/'

  const isLoggingIn = usePartnerStore((state) => state.isLoggingIn)
  const loginAsync = usePartnerStore((state) => state.loginAsync)
  const finishLoginAsync = usePartnerStore((state) => state.finishLoginAsync)

  const [key, setKey] = useState('')
  const [dialogErrorText, setDialogErrorText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const isDialogSubmitDisabled = !key || isLoading

  const isDialogOpened = isLoggingIn

  useEffect(() => {
    setDialogErrorText('')
    if (!isLoggingIn) {
      setKey('')
    }
  }, [isLoggingIn])

  const handeDialogSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setIsLoading(true)
    loginAsync(key).then((result) => {
      setIsLoading(false)
      if (result) {
        finishLoginAsync()
      } else {
        setDialogErrorText('Ошибка при входе в Partner')
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
        <DialogTitle>Вход в Partner</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="key"
            fullWidth
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={isLoading}
          />
          <Box sx={{ mt: 2 }}>
            <Link href={PARTNER_AUTH_FILL_INSTRUCTIONS} target="_blank" rel="noopener noreferrer">
              Как заполнить эту форму?
            </Link>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Link href={PARTNER_URL} target="_blank" rel="noopener noreferrer">
              Перейти в Partner
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
