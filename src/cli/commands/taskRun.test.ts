import { describe, expect, it } from 'vitest'
import { TaskEvent } from '../../tasks/TaskEvents'
import { taskRunOutput } from './taskRun'

describe('taskRunOutput: результат task run из событий', () => {
  const events: TaskEvent[] = [
    { kind: 'started', scope: 'SendCuratorMarks', message: 'Executing task "SendCuratorMarks"' },
    { kind: 'outcome', status: 'changed', scope: 'Иванов', message: 'Оценка выставлена' },
    { kind: 'outcome', status: 'unchanged', scope: 'Петров', message: 'Оценка уже стоит' },
    { kind: 'verdict', result: 'ok', scope: 'Команда 1', message: 'Все оценены' },
  ]

  it('успешный прогон: task, mode, events и summary; ok = true', () => {
    const output = taskRunOutput('SendCuratorMarks', 'try', events)

    expect(output.ok).toBe(true)
    expect(output.result).toEqual({
      task: 'SendCuratorMarks',
      mode: 'try',
      events,
      summary: {
        counts: { changed: 1, unchanged: 1, skipped: 0, warning: 0, error: 0 },
        verdicts: { ok: 1, attention: 0, failed: 0 },
        ok: true,
      },
    })
    expect(output.message).toBe(
      'SendCuratorMarks (try): выполнено. changed 1, unchanged 1, skipped 0, warning 0, error 0.',
    )
  })

  it('событие error — ok = false и сообщение об ошибках', () => {
    const failed: TaskEvent[] = [
      ...events,
      { kind: 'outcome', status: 'error', scope: 'SendCuratorMarks', message: 'boom', stopped: true },
    ]

    const output = taskRunOutput('SendCuratorMarks', 'save', failed)

    expect(output.ok).toBe(false)
    expect(output.message).toBe(
      'SendCuratorMarks (save): есть ошибки. changed 1, unchanged 1, skipped 0, warning 0, error 1.',
    )
  })

  it('проваленный вердикт — ok = false, число проваленных вердиктов в сообщении', () => {
    const output = taskRunOutput('SendCuratorMarks', 'try', [
      { kind: 'verdict', result: 'failed', scope: 'Команда 1', message: 'Не все оценены' },
    ])

    expect(output.ok).toBe(false)
    expect(output.message).toBe(
      'SendCuratorMarks (try): есть ошибки. changed 0, unchanged 0, skipped 0, warning 0, error 0; failed verdicts 1.',
    )
  })
})
