import { describe, expect, it } from 'vitest'
import { summarizeTaskEvents, TaskEvent, TaskEventCollector, TaskEventStatus, TaskVerdictEvent } from './TaskEvents'

// Сводка (Execution events, «Сводка»): outcome — в counts, verdict — в verdicts, остальное не считается.

const outcome = (status: TaskEventStatus): TaskEvent => ({
  kind: 'outcome',
  status,
  scope: 's',
  message: 'm',
})
const verdict = (result: TaskVerdictEvent['result']): TaskEvent => ({
  kind: 'verdict',
  result,
  scope: 's',
  message: 'm',
})

describe('summarizeTaskEvents', () => {
  it('пустой набор: нули, ok = true', () => {
    expect(summarizeTaskEvents([])).toEqual({
      counts: { changed: 0, unchanged: 0, skipped: 0, warning: 0, error: 0 },
      verdicts: { ok: 0, attention: 0, failed: 0 },
      ok: true,
    })
  })

  it('outcome считаются по статусам, verdict — по результатам, служебные события не считаются', () => {
    const summary = summarizeTaskEvents([
      { kind: 'started', scope: 's', message: 'm' },
      outcome('changed'),
      outcome('changed'),
      outcome('unchanged'),
      outcome('skipped'),
      outcome('warning'),
      { kind: 'heading', level: 1, message: 'm' },
      { kind: 'note', message: 'm', attention: true },
      { kind: 'separator' },
      verdict('ok'),
      verdict('attention'),
      verdict('attention'),
      { kind: 'finished', scope: 's', message: 'm' },
    ])

    expect(summary).toEqual({
      counts: { changed: 2, unchanged: 1, skipped: 1, warning: 1, error: 0 },
      verdicts: { ok: 1, attention: 2, failed: 0 },
      ok: true,
    })
  })

  it('warning и verdict attention не делают прогон не ok', () => {
    expect(summarizeTaskEvents([outcome('warning'), verdict('attention')]).ok).toBe(true)
  })

  it('outcome error → ok = false', () => {
    const summary = summarizeTaskEvents([outcome('changed'), outcome('error')])
    expect(summary.counts.error).toBe(1)
    expect(summary.ok).toBe(false)
  })

  it('verdict failed → ok = false, в counts не входит', () => {
    const summary = summarizeTaskEvents([outcome('changed'), verdict('failed')])
    expect(summary.counts.error).toBe(0)
    expect(summary.verdicts.failed).toBe(1)
    expect(summary.ok).toBe(false)
  })
})

describe('TaskEventCollector', () => {
  it('собирает события через listener и считает по ним сводку', () => {
    const collector = new TaskEventCollector()
    collector.listener(outcome('changed'))
    collector.listener(verdict('failed'))

    expect(collector.events).toEqual([outcome('changed'), verdict('failed')])
    expect(collector.getSummary()).toEqual({
      counts: { changed: 1, unchanged: 0, skipped: 0, warning: 0, error: 0 },
      verdicts: { ok: 0, attention: 0, failed: 1 },
      ok: false,
    })
  })
})
