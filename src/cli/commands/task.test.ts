import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { NodeCredentials } from '../../apis/NodeCredentials'
import { formatCsv } from '../../helpers/csv'
import { runProgramAsync } from '../program'

// Команды task list / task run через публичный вход CLI; без сети: учётных данных нет,
// поэтому задания останавливаются до обращения к внешним системам.

describe('task list', () => {
  it('--json: все типы заданий с нужными системами и признаком записи на лист', async () => {
    const { json, exitCode } = await runCliAsync(['task', 'list', '--json'])

    expect(exitCode).toBe(0)
    expect(json.command).toBe('task list')
    expect(json.result.tasks).toHaveLength(5)
    expect(json.result.tasks).toContainEqual({ name: 'ExportTechnologyCards', systems: ['brs'], writesToSheet: true })
    expect(json.result.tasks).toContainEqual({
      name: 'SendCuratorMarks',
      systems: ['teamproject'],
      writesToSheet: false,
    })
  })

  it('human: по строке на задание', async () => {
    const { stdout, exitCode } = await runCliAsync(['task', 'list'])

    expect(exitCode).toBe(0)
    expect(stdout).toContain('ExportTechnologyCards')
    expect(stdout).toContain('пишет на лист')
  })
})

describe('task run', () => {
  const tempDirs: string[] = []
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
  })

  function writeTaskCsv(grid: string[][]) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edu-tools-task-'))
    tempDirs.push(dir)
    const filePath = path.join(dir, 'task.csv')
    fs.writeFileSync(filePath, formatCsv(grid), 'utf8')
    return filePath
  }

  it('неизвестный тип задания: одно событие error, summary.ok = false, код выхода 1', async () => {
    const file = writeTaskCsv([
      ['$keys', '$values'],
      ['task', 'Unknown'],
    ])

    const { json, exitCode } = await runCliAsync(['task', 'run', file, '--json'])

    expect(exitCode).toBe(1)
    expect(json).toMatchObject({ command: 'task run', ok: false })
    expect(json.result.task).toBe('Unknown')
    expect(json.result.mode).toBe('try')
    expect(json.result.events).toEqual([
      { kind: 'outcome', status: 'error', scope: 'Unknown', message: 'Unknown task "Unknown"', stopped: true },
    ])
    expect(json.result.summary.ok).toBe(false)
  })

  it('нет учётных данных системы задания: событие error с кодом CREDENTIALS_MISSING', async () => {
    const file = writeTaskCsv([
      ['$keys', '$values'],
      ['task', 'SendCuratorMarks'],
    ])

    const { json, exitCode } = await runCliAsync(['task', 'run', file, '--save', '--json'])

    expect(exitCode).toBe(1)
    expect(json.result.mode).toBe('save')
    expect(json.result.events).toEqual([
      {
        kind: 'outcome',
        status: 'error',
        scope: 'SendCuratorMarks',
        message: expect.stringContaining('TEAMPROJECT_JWT'),
        details: {
          code: 'CREDENTIALS_MISSING',
          system: 'teamproject',
          variables: 'TEAMPROJECT_JWT, TEAMPROJECT_JWT_FILE',
        },
        stopped: true,
      },
    ])
  })

  it('human: строки лога как в web и итог', async () => {
    const file = writeTaskCsv([
      ['$keys', '$values'],
      ['task', 'Unknown'],
    ])

    const { stdout, exitCode } = await runCliAsync(['task', 'run', file])

    expect(exitCode).toBe(1)
    expect(stdout).toBe(
      '❌ Unknown task "Unknown"\nUnknown (try): есть ошибки. ' +
        'changed 0, unchanged 0, skipped 0, warning 0, error 1.\n',
    )
  })

  it('нет файла: ошибка TASK_SOURCE_INVALID', async () => {
    const { json, exitCode } = await runCliAsync(['task', 'run', path.join(os.tmpdir(), 'no-such-task.csv'), '--json'])

    expect(exitCode).toBe(1)
    expect(json.error).toMatchObject({ code: 'TASK_SOURCE_INVALID', details: { reason: 'not-found' } })
  })

  it('на листе нет параметра task: ошибка TASK_SOURCE_INVALID', async () => {
    const file = writeTaskCsv([['$Name'], ['Иванов']])

    const { json, exitCode } = await runCliAsync(['task', 'run', file, '--json'])

    expect(exitCode).toBe(1)
    expect(json.error).toMatchObject({ code: 'TASK_SOURCE_INVALID', details: { reason: 'no-task' } })
  })

  it('URL Google Таблицы без листа (gid): ошибка TASK_SOURCE_INVALID до обращения к Google', async () => {
    const { json, exitCode } = await runCliAsync([
      'task',
      'run',
      'https://docs.google.com/spreadsheets/d/abc123/edit',
      '--json',
    ])

    expect(exitCode).toBe(1)
    expect(json.error).toMatchObject({ code: 'TASK_SOURCE_INVALID', details: { reason: 'bad-url' } })
  })
})

async function runCliAsync(args: string[]) {
  let stdout = ''
  let stderr = ''
  let exitCode = -1
  await runProgramAsync(
    {
      credentials: new NodeCredentials({
        env: {},
        readFile: () => {
          throw new Error('no files')
        },
      }),
      streams: { stdout: (text) => (stdout += text), stderr: (text) => (stderr += text) },
      setExitCode: (code) => (exitCode = code),
    },
    args,
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = args.includes('--json') ? (JSON.parse(stdout) as any) : null
  return { stdout, stderr, exitCode, json }
}
