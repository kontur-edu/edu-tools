import * as React from 'react';
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
  CircularProgress
} from '@mui/material';

import { ItsController } from '../controllers/ItsController';
import { FormEvent, useEffect, useState } from 'react';

export default function App({ itsController: itsController }: { itsController: ItsController }) {
  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          EduTools
        </Typography>
        <ItsSwitch itsController={itsController} />
      </Box>
    </Container>
  );
}

export function ItsSwitch({ itsController: itsController }: { itsController: ItsController }) {
  const ITS_AUTH_FILL_INSTRUCTIONS = 'https://docs.google.com/document/d/1btXePo-5bE8RyX7RFXnBuS-UN9SmwUithpc_UXhAWsg/edit';
  const ITS_URL = 'https://its.urfu.ru/';

  const [isAuthEnabled, setIsAuthEnabled] = useState(false);
  const [isDialogOpened, setIsDialogOpened] = useState(false);
  const [sessionInfo, setSessionInfo] = useState('');
  const [itsAuth, setItsAuth] = useState('');
  const [dialogErrorText, setDialogErrorText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isDialogSubmitDisabled = !sessionInfo || !itsAuth || isLoading;

  useEffect(() => {
    setIsAuthEnabled(itsController.isLoggedIn());

    const unsubscribe = itsController.onAuthChanged.on(() => {
      if (itsController.isLoggedIn()) {
        setIsAuthEnabled(true);
        itsController.runAutoEnsureAuth();
      } else {
        setIsAuthEnabled(false);
        itsController.stopAutoEnsureAuth();
      }
    });

    return unsubscribe;
  }, [itsController]);

  const handleToggle = () => {
    if (isAuthEnabled) {
      if (itsController.isLoggedIn()) {
        handleLogout();
      } else {
        setIsAuthEnabled(false);
      }
    } else {
      if (!itsController.isLoggedIn()) {
        handleDialogOpen();
      } else {
        setIsAuthEnabled(true);
      }
    }
  };

  const handleDialogOpen = () => {
    setIsDialogOpened(true);
    setDialogErrorText('');
  }

  const handeDialogSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleLogin();
  }

  const handleDialogCancel = () => {
    if (!isLoading) {
      setIsDialogOpened(false);
      setDialogErrorText('');
    }
  }

  const handleLogin = () => {
    setIsLoading(true);
    itsController.logInAsync(sessionInfo, itsAuth).then((result) => {
      setIsLoading(false);
      if (result) {
        setIsDialogOpened(false);
        setDialogErrorText('');
        setSessionInfo('');
        setItsAuth('');
      } else {
        setDialogErrorText('Ошибка при входе в ИТС');
      }
    });
  };

  const handleLogout = () => {
    setIsLoading(true);
    itsController.logOutAsync().then(() => {
      setIsLoading(false);
      setIsDialogOpened(false);
      setDialogErrorText('');
      setSessionInfo('');
      setItsAuth('');
    });
  }

  return (
    <>
      <FormControlLabel 
        control={<Switch checked={isAuthEnabled} onChange={handleToggle} disabled={isLoading} />} 
        label="ИТС" 
      />
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
              label="itsAuth"
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
            <Button 
              disabled={isDialogSubmitDisabled}
              type="submit"
              variant="contained"
              color="primary"
            >
              Войти
            </Button>
            <Button onClick={handleDialogCancel} disabled={isLoading}>Отмена</Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
