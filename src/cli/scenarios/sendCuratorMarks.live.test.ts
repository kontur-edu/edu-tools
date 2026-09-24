import * as fs from 'fs'
import { describe, expect, it } from 'vitest'
import { missingCredentialsAsync, runLiveCliAsync, scenarioFixture } from '../../testing/cliProcess'

// Живые сценарии (npm run test:integration): try против TeamProject, во внешней системе ничего не меняется.

/** Локальный CSV с тестовым проектом TeamProject для SC-0015; содержит реальные ФИО, поэтому не коммитится. */
const PROJECT_CSV_VARIABLE = 'TEST_SEND_CURATOR_MARKS_CSV'

type Event = { kind: string; status?: string; scope?: string; stopped?: boolean; details?: unknown; level?: number }

describe('живые сценарии SendCuratorMarks', () => {
  // Фикстура обезличена и ссылается на несуществующий проект: результат не зависит от данных TeamProject,
  // а прогон проверяет авторизацию и чтение списка рабочих пространств.
  it('SC-0014: try из CSV — строки с проектом не найдены, строка без проекта пропущена', async (context) => {
    const missing = await missingCredentialsAsync('teamproject')
    if (missing) context.skip(missing)

    const { json, exitCode } = await runTaskAsync(scenarioFixture('SC-0014-send-curator-marks.csv'))

    const events: Event[] = json.result.events
    expect(events.filter((e) => e.kind === 'outcome').map((e) => [e.status, e.scope])).toEqual([
      ['error', 'Тестов Тест Тестович'],
      ['error', 'Примеров Пример Примерович'],
      ['skipped', 'Образцов Образец Образцович'],
    ])
    expect(events).toContainEqual(
      expect.objectContaining({ kind: 'verdict', result: 'failed', scope: 'SendCuratorMarks' }),
    )
    expect(json.result.summary).toMatchObject({ ok: false, counts: { changed: 0, error: 2, skipped: 1 } })
    expect(exitCode).toBe(1)
  })

  // Проект и оценки берутся из тестового проекта: доходит до итерации, оценок и сравнения с таблицей.
  // try ничего не пишет, поэтому повторный прогон даёт те же события (иначе changed сменился бы на unchanged).
  it('SC-0015: try по тестовому проекту — проект обработан, повторный прогон даёт те же события', async (context) => {
    const file = process.env[PROJECT_CSV_VARIABLE]?.trim() ?? ''
    if (!file) context.skip(`не задан ${PROJECT_CSV_VARIABLE} — путь к CSV с тестовым проектом TeamProject`)
    const missing = await missingCredentialsAsync('teamproject')
    if (missing) context.skip(missing)
    expect(fs.existsSync(file), `${PROJECT_CSV_VARIABLE}: нет файла ${file}`).toBe(true)

    const first = await runTaskAsync(file)
    const second = await runTaskAsync(file)

    const events: Event[] = first.json.result.events
    expect(
      events.some((e) => e.kind === 'heading' && e.level === 2),
      'ни один проект таблицы не найден',
    ).toBe(true)
    expect(outcomes(second.json.result.events)).toEqual(outcomes(events))
  })
})

// Общие проверки живого прогона: try и ни одной остановки — остановка означала бы сбой авторизации, сети или API.
async function runTaskAsync(file: string) {
  const result = await runLiveCliAsync(['task', 'run', file, '--json'])
  expect(result.json).toMatchObject({ command: 'task run', result: { task: 'SendCuratorMarks', mode: 'try' } })
  expect((result.json.result.events as Event[]).filter((e) => e.stopped)).toEqual([])
  return result
}

function outcomes(events: Event[]) {
  return events.filter((e) => e.kind === 'outcome').map(({ status, scope, details }) => ({ status, scope, details }))
}
