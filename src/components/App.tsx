import * as React from 'react'
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from '@mui/material'
import { GoogleAuthPanel } from './GoogleAuth/GoogleAuthPanel'
import { BrowserRouter, Routes, Route, Link as RouterLink } from 'react-router-dom'
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
import { useEffect, useRef, useState } from 'react'
import { useGoogleStore } from '../stores/GoogleStore'
import { GoogleAuthProvider } from './GoogleAuth/GoogleAuthProvider'
import { useTeamProjectStore } from '../stores/TeamProjectStore'
import { TableTask, TableTaskReader, TableTaskWriter } from '../tasks/TableTask'
import { TaskReporter } from '../tasks/TaskReporter'
import { textTaskEventListener } from '../tasks/TaskEventText'
import { PrivacyPolicy } from './PrivacyPolicy'
import { Footer } from './Footer'
import { CompositeTableTaskExecutor } from '../tasks/CompositeTableTaskExecutor'
import { useItsStore } from '../stores/ItsStore'
import { usePartnerStore } from '../stores/PartnerStore'
import { useBrsStore } from '../stores/BrsStore'

export default function App() {
  const [task, setTask] = useState<TableTask | null>(null)
  const [taskExecutionState, setTaskExecution] = useState<'try' | 'save' | null>(null)

  const handleTaskLoading = () => {
    setTask(null)
    setTaskExecution(null)
  }

  const handleTaskLoaded = (task: TableTask | null): void => {
    setTask(task)
    setTaskExecution(null)
  }

  return (
    <GoogleAuthProvider>
      <BrowserRouter>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Container maxWidth="md">
            <Box sx={{ my: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography
                  variant="h4"
                  component={RouterLink}
                  to="/"
                  sx={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
                >
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
                <Route path="/privacy" element={<PrivacyPolicy />} />
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
                        <SpreadsheetForm
                          onTaskLoading={handleTaskLoading}
                          onTaskLoaded={handleTaskLoaded}
                          disabled={!!taskExecutionState}
                        />
                        {task && (
                          <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                            <Button
                              variant="contained"
                              color="primary"
                              disabled={!!taskExecutionState}
                              onClick={() => setTaskExecution('try')}
                            >
                              Попробовать сделать хорошо
                            </Button>
                            <Button
                              variant="contained"
                              color="warning"
                              disabled={!!taskExecutionState}
                              onClick={() => setTaskExecution('save')}
                            >
                              Сделать хорошо
                            </Button>
                          </Box>
                        )}
                        {task && (
                          <TaskExecutionDialog
                            task={task}
                            taskExecutionState={taskExecutionState}
                            onFinish={() => setTaskExecution(null)}
                          />
                        )}
                      </ShowIfGoogleAuth>
                    </>
                  }
                />
              </Routes>
            </Box>
          </Container>
          <Footer />
        </Box>
      </BrowserRouter>
    </GoogleAuthProvider>
  )
}

function TaskExecutionDialog({
  task,
  taskExecutionState,
  onFinish,
}: {
  task: TableTask
  taskExecutionState: 'try' | 'save' | null
  onFinish?: () => void
}) {
  const isOpened = taskExecutionState !== null
  const [isExecuting, setIsExecuting] = useState(false)
  const [content, setContent] = useState('')
  const textFieldRef = useRef<HTMLDivElement>(null)

  const getGoogleApi = useGoogleStore((state) => state.getApi)
  const getTeamProjectApi = useTeamProjectStore((state) => state.getApi)
  const getItsApi = useItsStore((state) => state.getApi)
  const getBrsApi = useBrsStore((state) => state.getApi)
  const getPartnerApi = usePartnerStore((state) => state.getApi)

  useEffect(() => {
    setIsExecuting(true)

    try {
      if (taskExecutionState === 'try' || taskExecutionState === 'save') {
        setContent('')

        const appendText = (message?: string) => {
          setContent((prev) => prev + (message ? message + '\n' : '\n'))

          // Прокрутка к последней строке после обновления контента
          setTimeout(() => {
            if (textFieldRef.current) {
              const textarea = textFieldRef.current.querySelector('textarea')
              if (textarea) {
                textarea.scrollTop = textarea.scrollHeight
              }
            }
          }, 0)
        }
        const reporter = new TaskReporter(textTaskEventListener(appendText))
        const forceSave = taskExecutionState === 'save' ? true : taskExecutionState === 'try' ? false : null

        const googleApi = getGoogleApi()

        if (!googleApi) {
          setContent('Требуется авторизация в Google...')
          setIsExecuting(false)
          return
        }
        const taskWriter = new TableTaskWriter()

        const requreTeamProjectApi = () => {
          const teamProjectApi = getTeamProjectApi()
          if (!teamProjectApi) {
            setContent('Требуется авторизация в TeamProject...')
            setIsExecuting(false)
            return null
          }
          return teamProjectApi
        }

        const requreItsApi = () => {
          const itsApi = getItsApi()
          if (!itsApi) {
            setContent('Требуется авторизация в ITS...')
            setIsExecuting(false)
            return null
          }
          return itsApi
        }

        const requreBrsApi = () => {
          const brsApi = getBrsApi()
          if (!brsApi) {
            setContent('Требуется авторизация в BRS...')
            setIsExecuting(false)
            return null
          }
          return brsApi
        }

        const requrePartnerApi = () => {
          const partnerApi = getPartnerApi()
          if (!partnerApi) {
            setContent('Требуется авторизация в Partner...')
            setIsExecuting(false)
            return null
          }
          return partnerApi
        }

        const executor = new CompositeTableTaskExecutor(
          requreBrsApi,
          requreItsApi,
          requrePartnerApi,
          requreTeamProjectApi,
          taskWriter,
          reporter,
        )
        executor.executeAsync(task, forceSave).then(() => {
          setIsExecuting(false)
        })
      }
    } catch (error) {
      setIsExecuting(false)
    }
  }, [taskExecutionState])

  const handleCloseDialog = () => {
    if (isExecuting) return

    onFinish && onFinish()
  }

  return (
    <Dialog open={isOpened} onClose={handleCloseDialog} fullWidth maxWidth="md">
      <DialogTitle>Выполнение задания</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          fullWidth
          multiline
          rows={20}
          variant="outlined"
          value={content}
          ref={textFieldRef}
        />
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center' }}>
        <Button onClick={handleCloseDialog} disabled={isExecuting} color="primary" variant="contained">
          ОК
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function SpreadsheetForm({
  onTaskLoading,
  onTaskLoaded,
  disabled,
}: {
  onTaskLoading: () => void
  onTaskLoaded: (task: TableTask | null) => void
  disabled: boolean
}) {
  const [isLoading, setIsLoading] = useState(false)

  const [spreadsheetUrl, setSpreadsheetUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const getGoogleApi = useGoogleStore((state) => state.getApi)

  const handleDialogSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    onTaskLoading()

    try {
      const googleApi = getGoogleApi()

      if (!googleApi) {
        throw new Error('Требуется авторизация')
      }

      const taskReader = new TableTaskReader(googleApi)

      const task = await taskReader.readTaskByUrlAsync(spreadsheetUrl)
      if (!task) {
        onTaskLoaded(null)
        throw new Error('Не удалось прочитать задание')
      } else {
        onTaskLoaded(task)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла неизвестная ошибка')
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
          <Button variant="contained" color="primary" type="submit" disabled={isLoading || disabled}>
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
      </form>
    </>
  )
}
