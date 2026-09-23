import { TaskEvent, TaskEventDetails, TaskEventListener, TaskEventStatus, TaskVerdictEvent } from './TaskEvents'
import { consoleTaskEventListener } from './TaskEventText'

// Entry point for executors and actions to report task execution events.
export class TaskReporter {
  private readonly listeners: TaskEventListener[]

  constructor(...listeners: TaskEventListener[]) {
    this.listeners = listeners
  }

  static console(): TaskReporter {
    return new TaskReporter(consoleTaskEventListener)
  }

  report(event: TaskEvent) {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  started(scope: string, message: string) {
    this.report({ kind: 'started', scope, message })
  }

  finished(scope: string, message: string) {
    this.report({ kind: 'finished', scope, message })
  }

  heading(level: 1 | 2 | 3, message: string) {
    this.report({ kind: 'heading', level, message })
  }

  note(message: string, attention = false) {
    this.report(attention ? { kind: 'note', message, attention } : { kind: 'note', message })
  }

  verdict(result: TaskVerdictEvent['result'], scope: string, message: string) {
    this.report({ kind: 'verdict', result, scope, message })
  }

  separator() {
    this.report({ kind: 'separator' })
  }

  changed(scope: string, message: string, details?: TaskEventDetails) {
    this.outcome('changed', scope, message, details)
  }

  unchanged(scope: string, message: string, details?: TaskEventDetails) {
    this.outcome('unchanged', scope, message, details)
  }

  skipped(scope: string, message: string, details?: TaskEventDetails) {
    this.outcome('skipped', scope, message, details)
  }

  warning(scope: string, message: string, details?: TaskEventDetails) {
    this.outcome('warning', scope, message, details)
  }

  error(scope: string, message: string, options: { stopped?: boolean; details?: TaskEventDetails } = {}) {
    this.report({
      kind: 'outcome',
      status: 'error',
      scope,
      message,
      ...(options.details ? { details: options.details } : {}),
      ...(options.stopped ? { stopped: true } : {}),
    })
  }

  private outcome(status: TaskEventStatus, scope: string, message: string, details?: TaskEventDetails) {
    this.report(details ? { kind: 'outcome', status, scope, message, details } : { kind: 'outcome', status, scope, message })
  }
}
