export type TaskEventStatus = 'changed' | 'unchanged' | 'skipped' | 'warning' | 'error'

export type TaskEventDetails = { [key: string]: string | number | boolean | null }

// Result of processing an entity (project, team, student, technology card...).
// Only outcomes are counted in the summary.
export interface TaskOutcomeEvent {
  kind: 'outcome'
  status: TaskEventStatus
  scope: string
  message: string
  details?: TaskEventDetails
  // processing of the scope has been stopped after this event
  stopped?: boolean
}

// Processing of a scope (task, technology card) has been started or finished.
export interface TaskStartedEvent {
  kind: 'started'
  scope: string
  message: string
}

export interface TaskFinishedEvent {
  kind: 'finished'
  scope: string
  message: string
}

// Conclusion about a whole scope, e.g. "all project students have been rated".
// Not counted in the summary, but a failed verdict makes the run not ok.
export interface TaskVerdictEvent {
  kind: 'verdict'
  result: 'ok' | 'attention' | 'failed'
  scope: string
  message: string
}

// Title of a log section (project, team, totals).
export interface TaskHeadingEvent {
  kind: 'heading'
  level: 1 | 2 | 3
  message: string
}

// Informational line, e.g. a task parameter.
export interface TaskNoteEvent {
  kind: 'note'
  message: string
  attention?: boolean
}

export interface TaskSeparatorEvent {
  kind: 'separator'
}

export type TaskEvent =
  | TaskOutcomeEvent
  | TaskStartedEvent
  | TaskFinishedEvent
  | TaskVerdictEvent
  | TaskHeadingEvent
  | TaskNoteEvent
  | TaskSeparatorEvent

export type TaskEventListener = (event: TaskEvent) => void

export interface TaskEventSummary {
  // outcomes (item level) by status
  counts: { [status in TaskEventStatus]: number }
  // verdicts (stage level) by result
  verdicts: { [result in TaskVerdictEvent['result']]: number }
  ok: boolean
}

export function summarizeTaskEvents(events: ReadonlyArray<TaskEvent>): TaskEventSummary {
  const counts = { changed: 0, unchanged: 0, skipped: 0, warning: 0, error: 0 }
  const verdicts = { ok: 0, attention: 0, failed: 0 }
  for (const event of events) {
    if (event.kind === 'outcome') {
      counts[event.status]++
    } else if (event.kind === 'verdict') {
      verdicts[event.result]++
    }
  }
  return {
    counts,
    verdicts,
    ok: counts.error === 0 && verdicts.failed === 0,
  }
}

export class TaskEventCollector {
  readonly events: TaskEvent[] = []

  readonly listener: TaskEventListener = (event) => {
    this.events.push(event)
  }

  getSummary(): TaskEventSummary {
    return summarizeTaskEvents(this.events)
  }
}
