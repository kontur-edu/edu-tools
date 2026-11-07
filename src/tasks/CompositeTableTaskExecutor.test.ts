import { describe, expect, it } from 'vitest'
import { BrsApi } from '../apis/BrsApi'
import { BrsAuth } from '../apis/BrsAuth'
import { BrsUrlProvider } from '../apis/BrsUrlProvider'
import { CompositeTableTaskExecutor, findTableTaskType, tableTaskTypes } from './CompositeTableTaskExecutor'
import { readTableTaskAsync, TableTask, TableTaskWriter } from './TableTask'
import { InMemoryTableSource } from './TableSource'
import { TaskExecutionError } from './TaskExecutionError'
import { TaskEventCollector } from './TaskEvents'
import { renderTaskEventText } from './TaskEventText'
import { TaskReporter } from './TaskReporter'

describe('реестр типов заданий', () => {
  it('содержит все задания из Task catalog с нужными системами и признаком записи на лист', () => {
    expect(tableTaskTypes.map(({ name, systems, writesToSheet }) => ({ name, systems, writesToSheet }))).toEqual(
      expect.arrayContaining([
        { name: 'ExportTechnologyCards', systems: ['brs'], writesToSheet: true },
        { name: 'CreateTechnologyCards', systems: ['brs'], writesToSheet: false },
        { name: 'DistributeStudentsIntoTeams', systems: ['its'], writesToSheet: false },
        { name: 'CreateTeamProjectIterations', systems: ['teamproject'], writesToSheet: false },
        { name: 'SendCuratorMarks', systems: ['teamproject'], writesToSheet: false },
        { name: 'PutMarksToBrs', systems: ['brs'], writesToSheet: false },
      ]),
    )
    expect(tableTaskTypes).toHaveLength(6)
  })

  it('находит тип задания без учёта регистра', () => {
    expect(findTableTaskType('sendcuratormarks')?.name).toBe('SendCuratorMarks')
    expect(findTableTaskType('Unknown')).toBeNull()
  })
})

describe('CompositeTableTaskExecutor', () => {
  it('неизвестный тип задания — одно событие error', async () => {
    const { executor, collector } = createExecutor({})

    await executor.executeAsync(await readTaskAsync('Unknown'), false)

    expect(collector.events).toEqual([
      { kind: 'outcome', status: 'error', scope: 'Unknown', message: 'Unknown task "Unknown"', stopped: true },
    ])
    expect(collector.getSummary().ok).toBe(false)
  })

  it('недоступный API — одно событие error с details от поставщика API', async () => {
    const { executor, collector } = createExecutor({
      getTeamProjectApi: () => {
        throw new TaskExecutionError('TeamProject: учётные данные не заданы.', {
          code: 'CREDENTIALS_MISSING',
          system: 'teamproject',
        })
      },
    })

    await executor.executeAsync(await readTaskAsync('SendCuratorMarks'), false)

    expect(collector.events).toEqual([
      {
        kind: 'outcome',
        status: 'error',
        scope: 'SendCuratorMarks',
        message: 'TeamProject: учётные данные не заданы.',
        details: { code: 'CREDENTIALS_MISSING', system: 'teamproject' },
        stopped: true,
      },
    ])
  })

  it('API, которого нет в web-сессии (null), — событие error, как раньше', async () => {
    const { executor, collector } = createExecutor({})

    await executor.executeAsync(await readTaskAsync('CreateTechnologyCards'), false)

    expect(collector.events).toEqual([
      {
        kind: 'outcome',
        status: 'error',
        scope: 'CreateTechnologyCards',
        message: 'BRS API is not available',
        stopped: true,
      },
    ])
  })

  it('PutMarksToBrs без semester — «- semester required❗», задание не выполняется, summary.ok = false', async () => {
    const { executor, collector } = createExecutor({
      getBrsApi: () => new BrsApi(new BrsAuth('test-sid'), new BrsUrlProvider(false)),
    })
    const task = await readTableTaskAsync(
      new InMemoryTableSource([
        ['$keys', '$values', '$group', '$student', '$$экзамен'],
        ['task', 'PutMarksToBrs', 'МЕН-1', 'Иванов Иван', '10'],
        ['discipline', 'Основы программирования'],
        ['academicYear', '2024/2025'],
      ]),
    )
    if (!task) throw new Error('Задание не прочитано')

    await executor.executeAsync(task, false)

    expect(collector.events.map(renderTaskEventText)).toContain('- semester required❗')
    expect(collector.events).toContainEqual({
      kind: 'outcome',
      status: 'error',
      scope: 'PutMarksToBrs',
      message: 'Execution has been stopped',
      stopped: true,
    })
    expect(collector.getSummary().ok).toBe(false)
  })
})

type Getters = Partial<
  Pick<CompositeTableTaskExecutor, 'getBrsApi' | 'getItsApi' | 'getPartnerApi' | 'getTeamProjectApi'>
>

function createExecutor(getters: Getters) {
  const collector = new TaskEventCollector()
  const executor = new CompositeTableTaskExecutor(
    getters.getBrsApi ?? (() => null),
    getters.getItsApi ?? (() => null),
    getters.getPartnerApi ?? (() => null),
    getters.getTeamProjectApi ?? (() => null),
    new TableTaskWriter(),
    new TaskReporter(collector.listener),
  )
  return { executor, collector }
}

async function readTaskAsync(name: string): Promise<TableTask> {
  const task = await readTableTaskAsync(
    new InMemoryTableSource([
      ['$keys', '$values'],
      ['task', name],
    ]),
  )
  if (!task) throw new Error('Задание не прочитано')
  return task
}
