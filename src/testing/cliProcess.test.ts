import { describe, expect, it } from 'vitest'
import { runLiveCliAsync } from './cliProcess'

describe('runLiveCliAsync', () => {
  it.each([['--save'], ['--save=true']])(
    'отклоняет %s до запуска процесса: живые сценарии только в try',
    async (flag) => {
      await expect(runLiveCliAsync(['task', 'run', 'task.csv', flag, '--json'])).rejects.toThrow(
        'Живые сценарии выполняются только в try',
      )
    },
  )
})
