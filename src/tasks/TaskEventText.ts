import { TaskEvent, TaskEventListener, TaskOutcomeEvent, TaskVerdictEvent } from './TaskEvents'

// Renders an event as a line of the human-readable task log (web and console).
export function renderTaskEventText(event: TaskEvent): string {
  switch (event.kind) {
    case 'outcome':
      return `${outcomeIcon(event)} ${event.message}`
    case 'started':
      return `🚩 ${event.message}`
    case 'finished':
      return `✅ ${event.message}`
    case 'verdict':
      return `${verdictIcons[event.result]} ${event.message}`
    case 'heading':
      return `${'#'.repeat(event.level)} ${event.message}`
    case 'note':
      return `- ${event.message}${event.attention ? '❗' : ''}`
    case 'separator':
      return ''
  }
}

export function textTaskEventListener(appendLine: (line: string) => void): TaskEventListener {
  return (event) => appendLine(renderTaskEventText(event))
}

export const consoleTaskEventListener: TaskEventListener = textTaskEventListener((line) => console.log(line))

function outcomeIcon(event: TaskOutcomeEvent): string {
  switch (event.status) {
    case 'changed':
      return '🟢'
    case 'unchanged':
    case 'skipped':
      return '🟡'
    case 'warning':
      return '⚠️'
    case 'error':
      return event.stopped ? '❌' : '🔴'
  }
}

const verdictIcons: { [result in TaskVerdictEvent['result']]: string } = {
  ok: '🟩',
  attention: '🟨',
  failed: '🟥',
}
