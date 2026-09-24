import { describe, expect, it } from 'vitest'
import { renderTaskEventText, textTaskEventListener } from './TaskEventText'
import { TaskEvent } from './TaskEvents'

// Текстовый рендер (Execution events, «Текстовый рендер»): строка лога по каждому событию.

describe('renderTaskEventText', () => {
  it.each<[string, TaskEvent, string]>([
    ['outcome changed', { kind: 'outcome', status: 'changed', scope: 's', message: 'm' }, '🟢 m'],
    ['outcome unchanged', { kind: 'outcome', status: 'unchanged', scope: 's', message: 'm' }, '🟡 m'],
    ['outcome skipped', { kind: 'outcome', status: 'skipped', scope: 's', message: 'm' }, '🟡 m'],
    ['outcome warning', { kind: 'outcome', status: 'warning', scope: 's', message: 'm' }, '⚠️ m'],
    ['outcome error', { kind: 'outcome', status: 'error', scope: 's', message: 'm' }, '🔴 m'],
    ['outcome error stopped', { kind: 'outcome', status: 'error', scope: 's', message: 'm', stopped: true }, '❌ m'],
    ['verdict ok', { kind: 'verdict', result: 'ok', scope: 's', message: 'm' }, '🟩 m'],
    ['verdict attention', { kind: 'verdict', result: 'attention', scope: 's', message: 'm' }, '🟨 m'],
    ['verdict failed', { kind: 'verdict', result: 'failed', scope: 's', message: 'm' }, '🟥 m'],
    ['started', { kind: 'started', scope: 's', message: 'm' }, '🚩 m'],
    ['finished', { kind: 'finished', scope: 's', message: 'm' }, '✅ m'],
    ['heading 1', { kind: 'heading', level: 1, message: 'm' }, '# m'],
    ['heading 3', { kind: 'heading', level: 3, message: 'm' }, '### m'],
    ['note', { kind: 'note', message: 'm' }, '- m'],
    ['note attention', { kind: 'note', message: 'm', attention: true }, '- m❗'],
    ['separator', { kind: 'separator' }, ''],
  ])('%s', (_, event, line) => {
    expect(renderTaskEventText(event)).toBe(line)
  })
})

describe('textTaskEventListener', () => {
  it('набор событий даёт строки лога в порядке событий', () => {
    const lines: string[] = []
    const listener = textTaskEventListener((line) => lines.push(line))
    const events: TaskEvent[] = [
      { kind: 'started', scope: 'PutMarksToBrs', message: 'Executing task "PutMarksToBrs"' },
      { kind: 'note', message: 'semester required', attention: true },
      { kind: 'heading', level: 2, message: 'Группа МЕН-1' },
      { kind: 'outcome', status: 'changed', scope: 'Иванов (МЕН-1)', message: 'Иванов: 5' },
      { kind: 'outcome', status: 'error', scope: 'Петров (МЕН-1)', message: 'Петров не найден', stopped: true },
      { kind: 'separator' },
      { kind: 'verdict', result: 'failed', scope: 'МЕН-1', message: 'Не все оценки выставлены' },
      { kind: 'finished', scope: 'PutMarksToBrs', message: 'Done' },
    ]

    events.forEach(listener)

    expect(lines).toEqual([
      '🚩 Executing task "PutMarksToBrs"',
      '- semester required❗',
      '## Группа МЕН-1',
      '🟢 Иванов: 5',
      '❌ Петров не найден',
      '',
      '🟥 Не все оценки выставлены',
      '✅ Done',
    ])
  })
})
