import { describe, expect, it } from 'vitest'
import { runOfflineCliAsync, scenarioFixture } from '../../testing/cliProcess'

// Офлайн-сценарии (Scenario registry): собранный CLI процессом, без учётных данных и сети.

describe('офлайн-сценарии CLI', () => {
  it('SC-0012: task list --json — все задания реестра, код выхода 0', async () => {
    const { json, exitCode } = await runOfflineCliAsync(['task', 'list', '--json'])

    expect(exitCode).toBe(0)
    expect(json).toMatchObject({ command: 'task list', ok: true })
    expect(json.result.tasks).toContainEqual({
      name: 'SendCuratorMarks',
      systems: ['teamproject'],
      writesToSheet: false,
    })
    expect(json.result.tasks).toContainEqual({ name: 'ExportTechnologyCards', systems: ['brs'], writesToSheet: true })
  })

  it('SC-0013: task run с неизвестным типом задания — событие error, summary.ok = false, код выхода 1', async () => {
    const { json, exitCode } = await runOfflineCliAsync([
      'task',
      'run',
      scenarioFixture('SC-0013-unknown-task.csv'),
      '--json',
    ])

    expect(exitCode).toBe(1)
    expect(json).toMatchObject({ command: 'task run', ok: false, result: { task: 'Unknown', mode: 'try' } })
    expect(json.result.events).toEqual([
      { kind: 'outcome', status: 'error', scope: 'Unknown', message: 'Unknown task "Unknown"', stopped: true },
    ])
    expect(json.result.summary).toMatchObject({ ok: false, counts: { error: 1 } })
  })
})
