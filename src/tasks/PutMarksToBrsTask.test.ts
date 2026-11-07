import { describe, expect, it } from 'vitest'
import { BrsApi, CardType, ControlAction, Discipline, StudentFailure, StudentMark, TermType } from '../apis/BrsApi'
import { BrsAuth } from '../apis/BrsAuth'
import { BrsUrlProvider } from '../apis/BrsUrlProvider'
import { buildPutMarksTask, PutMarksToBrsTaskExecutor } from './PutMarksToBrsTask'
import { readTableTaskAsync, TableTask } from './TableTask'
import { InMemoryTableSource } from './TableSource'
import { TaskEventCollector } from './TaskEvents'
import { TaskReporter } from './TaskReporter'

const REQUIRED_PARAMS = [
  ['task', 'PutMarksToBrs'],
  ['discipline', 'Основы программирования'],
  ['academicYear', '2024/2025'],
  ['semester', 'spring'],
]

const MARKS_HEADER = [['$group', '$student', '$$экзамен']]

describe('buildPutMarksTask', () => {
  it('собирает DisciplineConfig из параметров', async () => {
    const { task } = buildTask(
      await readTaskAsync(
        [...REQUIRED_PARAMS, ['studyYear', '2'], ['isModule', 'true'], ['defaultFailure', 'Не явился']],
        MARKS_HEADER,
      ),
    )

    expect(task?.marksData.disciplineConfig).toEqual({
      name: 'Основы программирования',
      year: 2024,
      termType: TermType.Spring,
      course: 2,
      isModule: true,
      defaultStudentFailure: StudentFailure.NotAppeared,
      isSuitableDiscipline: null,
    })
  })

  it('по умолчанию: studyYear = 0 (все курсы), isModule = false, причина отсутствия «-», save = false', async () => {
    const { task } = buildTask(
      await readTaskAsync([...REQUIRED_PARAMS.slice(0, 3), ['semester', 'fall']], MARKS_HEADER),
    )

    expect(task?.marksData.disciplineConfig).toMatchObject({
      termType: TermType.Fall,
      course: 0,
      isModule: false,
      defaultStudentFailure: StudentFailure.NoFailure,
    })
    expect(task?.save).toBe(false)
  })

  it('save берётся из параметра, а режим запуска (forceSave) его переопределяет', async () => {
    const tableTask = await readTaskAsync([...REQUIRED_PARAMS, ['save', 'true']], MARKS_HEADER)

    expect(buildTask(tableTask).task?.save).toBe(true)
    expect(buildTask(tableTask, false).task?.save).toBe(false)
  })

  it('строки → ActualStudent: $student, $group, $failure и значения $$-колонок по порядку', async () => {
    const { task, collector } = buildTask(
      await readTaskAsync(REQUIRED_PARAMS, [
        ['$group', '$student', '$failure', '$$домашняя работа', '$$экзамен'],
        ['МЕН-1', 'Иванов Иван', '', '5', '10'],
        ['МЕН-1', 'Петров Пётр', 'Не явился', '', ''],
        ['', 'Без группы', '', '1', '1'],
      ]),
    )

    expect(task?.marksData.actualStudents).toEqual([
      { fullName: 'Иванов Иван', groupName: 'МЕН-1', id: null, failure: null, properties: ['5', '10'] },
      {
        fullName: 'Петров Пётр',
        groupName: 'МЕН-1',
        id: null,
        failure: StudentFailure.NotAppeared,
        properties: ['', ''],
      },
    ])
    expect(collector.events).toContainEqual({
      kind: 'note',
      message: '2 students were found in 3 rows',
      attention: true,
    })
  })

  it('$$-заголовки → ControlActionConfig; одинаковые названия (нормализованно) → matchIndex/matchCount по порядку', async () => {
    const { task } = buildTask(
      await readTaskAsync(REQUIRED_PARAMS, [
        ['$group', '$student', '$$Домашняя работа', '$$Лаб. работа', '$$домашняя  работа', '$$экзамен'],
        ['МЕН-1', 'Иванов Иван', '1', '2', '3', '4'],
      ]),
    )

    expect(task?.marksData.controlActionConfigs).toEqual([
      { controlActions: ['Домашняя работа'], propertyIndex: 0, matchIndex: 0, matchCount: 2 },
      { controlActions: ['Лаб. работа'], propertyIndex: 1 },
      { controlActions: ['домашняя  работа'], propertyIndex: 2, matchIndex: 1, matchCount: 2 },
      { controlActions: ['экзамен'], propertyIndex: 3 },
    ])
  })

  it.each([
    ['discipline', REQUIRED_PARAMS.filter(([key]) => key !== 'discipline')],
    ['academicYear', REQUIRED_PARAMS.filter(([key]) => key !== 'academicYear')],
    ['semester', REQUIRED_PARAMS.filter(([key]) => key !== 'semester')],
    ['semester', [...REQUIRED_PARAMS.slice(0, 3), ['semester', 'winter']]],
  ])('нет обязательного параметра %s (или он не распознан) → задание не собрано', async (param, params) => {
    const { task, collector } = buildTask(await readTaskAsync(params, MARKS_HEADER))

    expect(task).toBeNull()
    expect(collector.events).toContainEqual({ kind: 'note', message: `${param} required`, attention: true })
  })

  it('studyYear не целое → задание не собрано', async () => {
    const { task, collector } = buildTask(await readTaskAsync([...REQUIRED_PARAMS, ['studyYear', 'все']], MARKS_HEADER))

    expect(task).toBeNull()
    expect(collector.events).toContainEqual({ kind: 'note', message: 'studyYear must be an integer', attention: true })
  })

  it('без $$-колонок задание не собрано', async () => {
    const { task, collector } = buildTask(
      await readTaskAsync(REQUIRED_PARAMS, [
        ['$group', '$student'],
        ['МЕН-1', 'Иванов Иван'],
      ]),
    )

    expect(task).toBeNull()
    expect(collector.events).toContainEqual({
      kind: 'note',
      message: 'control action columns ($$) required',
      attention: true,
    })
  })
})

describe('PutMarksToBrsTaskExecutor', () => {
  const MARKS_SHEET = [
    ['$group', '$student', '$$домашняя работа', '$$домашняя работа', '$$экзамен'],
    ['МЕН-1', 'Иванов Иван', '5', '7', '20'],
  ]

  it('save: одинаковые колонки сопоставлены с мероприятиями БРС по порядку, отчёт — события без статуса', async () => {
    const brsApi = new FakeBrsApi()
    const { collector } = await executeAsync(brsApi, MARKS_SHEET, true)

    expect(brsApi.putMarks).toEqual([
      { controlActionId: 'hw1', mark: 5 },
      { controlActionId: 'hw2', mark: 7 },
      { controlActionId: 'exam', mark: 20 },
    ])
    expect(brsApi.putFailures).toEqual([{ studentUuid: 'petrov', failure: StudentFailure.NoFailure }])
    expect(brsApi.updateAllMarksCalls).toBe(1)
    expect(collector.events).toContainEqual({ kind: 'heading', level: 1, message: 'Processing group МЕН-1' })
    expect(collector.events).toContainEqual({ kind: 'note', message: 'Merged students = 1' })
    expect(collector.events.filter((it) => it.kind === 'outcome')).toEqual([])
    expect(collector.events.at(-2)).toEqual({
      kind: 'finished',
      scope: 'PutMarksToBrs',
      message: 'Execution has been completed',
    })
    expect(collector.getSummary().ok).toBe(true)
  })

  it('try: в БРС ничего не пишется, summary.ok = true', async () => {
    const brsApi = new FakeBrsApi()
    const { collector } = await executeAsync(brsApi, MARKS_SHEET, false)

    expect(brsApi.putMarks).toEqual([])
    expect(brsApi.putFailures).toEqual([])
    expect(brsApi.updateAllMarksCalls).toBe(0)
    expect(collector.events).toContainEqual({ kind: 'note', message: 'Marks update statuses:' })
    expect(collector.getSummary().ok).toBe(true)
  })

  it('исключение при переносе — событие error со stopped, summary.ok = false', async () => {
    const brsApi = new FakeBrsApi()
    brsApi.disciplinesError = new Error('БРС недоступна')
    const { collector } = await executeAsync(brsApi, MARKS_SHEET, false)

    expect(collector.events).toContainEqual({
      kind: 'outcome',
      status: 'error',
      scope: 'PutMarksToBrs',
      message: 'Execution has been failed: БРС недоступна',
      stopped: true,
    })
    expect(collector.getSummary().ok).toBe(false)
  })
})

// BrsApi без сети: одна дисциплина, мероприятия «домашняя работа» ×2 и «экзамен», два студента.
class FakeBrsApi extends BrsApi {
  disciplinesError: Error | null = null
  putMarks: { controlActionId: string; mark: number }[] = []
  putFailures: { studentUuid: string; failure: StudentFailure }[] = []
  updateAllMarksCalls = 0

  constructor() {
    super(new BrsAuth('test-sid'), new BrsUrlProvider(false))
  }

  async getDisciplinesAsync(): Promise<Discipline[]> {
    if (this.disciplinesError) throw this.disciplinesError
    return [
      {
        groupId: 'g1',
        discipline: 'Основы программирования',
        group: 'МЕН-1',
        registerInfo: [],
        disciplineLoad: 'load1',
        groupHistoryId: 'gh1',
        isModule: false,
      },
    ]
  }

  async getAllControlActionsAsync(): Promise<ControlAction[]> {
    return [
      { uuid: 'p-hw1', uuidWithoutPrefix: 'hw1', controlAction: 'Домашняя работа' },
      { uuid: 'p-exam', uuidWithoutPrefix: 'exam', controlAction: 'Экзамен' },
      { uuid: 'p-hw2', uuidWithoutPrefix: 'hw2', controlAction: 'Домашняя работа' },
    ]
  }

  async getAllStudentMarksAsync(): Promise<StudentMark[]> {
    return [brsStudent('ivanov', 'Иванов Иван Иванович'), brsStudent('petrov', 'Петров Пётр Петрович', -18)]
  }

  async putStudentMarkAsync(_studentUuid: string, controlActionId: string, mark: number): Promise<StudentMark> {
    this.putMarks.push({ controlActionId, mark })
    return brsStudent('ivanov', 'Иванов Иван Иванович')
  }

  async putStudentFailureAsync(studentUuid: string, _discipline: Discipline, failure = StudentFailure.NoFailure) {
    this.putFailures.push({ studentUuid, failure })
  }

  async updateAllMarksAsync(): Promise<void> {
    this.updateAllMarksCalls++
  }
}

function brsStudent(studentUuid: string, studentFio: string, failure?: StudentFailure): StudentMark {
  const cardType: CardType = 'lecture'
  return {
    studentPersonalNumber: '',
    isEdit: true,
    studentUuid,
    status: 1,
    studentStatus: 'Активный',
    ignoreCurrentDebars: false,
    studentFio,
    isExtern: false,
    teacherName: '',
    cardType,
    studentName: '',
    studentGroup: 'МЕН-1',
    registerClosed: false,
    subgroupsITS: '',
    disciplineLoad: 'load1',
    ...(failure !== undefined ? { failure } : {}),
  }
}

async function executeAsync(brsApi: BrsApi, data: string[][], save: boolean) {
  const collector = new TaskEventCollector()
  const executor = new PutMarksToBrsTaskExecutor(brsApi, new TaskReporter(collector.listener))
  await executor.executeAsync(await readTaskAsync(REQUIRED_PARAMS, data), save)
  return { collector }
}

function buildTask(tableTask: TableTask, forceSave: boolean | null = null) {
  const collector = new TaskEventCollector()
  const task = buildPutMarksTask(tableTask, new TaskReporter(collector.listener), forceSave)
  return { task, collector }
}

// Лист: слева пары $keys/$values, справа — колонки данных (первая строка data — заголовок).
async function readTaskAsync(params: string[][], data: string[][]): Promise<TableTask> {
  const height = Math.max(params.length + 1, data.length)
  const grid: string[][] = []
  for (let i = 0; i < height; i++) {
    const left = i === 0 ? ['$keys', '$values'] : params[i - 1] ?? ['', '']
    grid.push([...left, ...(data[i] ?? [])])
  }
  const task = await readTableTaskAsync(new InMemoryTableSource(grid))
  if (!task) throw new Error('Задание не прочитано')
  return task
}
