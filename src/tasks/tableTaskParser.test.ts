import { describe, expect, it } from 'vitest'
import { parseTableTask } from './tableTaskParser'

describe('parseTableTask', () => {
  it('читает тип задания, параметры из $keys/$values и строки данных из $-колонок', () => {
    const task = parseTableTask([
      ['$keys', '$values', '$Name', '$Group'],
      ['task', 'SendCuratorMarks', 'Иванов', 'МЕН-1'],
      ['save', 'true', 'Петров', 'МЕН-2'],
    ])

    expect(task).toEqual({
      name: 'SendCuratorMarks',
      params: { save: 'true' },
      rows: [
        { name: 'Иванов', group: 'МЕН-1' },
        { name: 'Петров', group: 'МЕН-2' },
      ],
      rowsByNamespace: {},
      columns: { name: 2, group: 3 },
    })
  })

  it('без параметра task лист не считается заданием', () => {
    expect(
      parseTableTask([
        ['$keys', '$values'],
        ['save', 'true'],
      ]),
    ).toBeNull()
    expect(parseTableTask([['$Name'], ['Иванов']])).toBeNull()
    expect(parseTableTask([])).toBeNull()
  })

  it('нормализует имена колонок и ключей параметров: регистр, пробелы, _, -, $ и ё не важны', () => {
    const task = parseTableTask([
      ['$ Keys', '$VALUES', '$Project Name', '$Учёба_Курс-1'],
      ['Task', 'X', 'p', 'c'],
      ['Academic Year', '2024/2025'],
    ])

    expect(task?.params).toEqual({ academicyear: '2024/2025' })
    expect(task?.columns).toEqual({ projectname: 2, учебакурс1: 3 })
    expect(task?.rows).toEqual([{ projectname: 'p', учебакурс1: 'c' }])
  })

  it('игнорирует колонки, заголовок которых не начинается с $', () => {
    const task = parseTableTask([
      ['$keys', '$values', 'Комментарий', '$Name', '=A1'],
      ['task', 'X', 'заметка', 'Иванов', 'формула'],
    ])

    expect(task?.columns).toEqual({ name: 3 })
    expect(task?.rows).toEqual([{ name: 'Иванов' }])
  })

  it('читает параметры до первой пустой ячейки ключа', () => {
    const task = parseTableTask([
      ['$keys', '$values'],
      ['task', 'X'],
      ['a', '1'],
      ['', 'пропуск'],
      ['b', '2'],
    ])

    expect(task?.params).toEqual({ a: '1' })
  })

  it('читает параметры только из первых 100 строк листа', () => {
    const grid = [['$keys', '$values']]
    for (let i = 1; i < 105; i++) {
      grid.push(i === 1 ? ['task', 'X'] : [`p${i}`, `${i}`])
    }

    const task = parseTableTask(grid)

    expect(task?.params.p99).toBe('99')
    expect(task?.params.p100).toBeUndefined()
  })

  it('обрезает пробелы в значениях и пропускает пустые строки данных', () => {
    const task = parseTableTask([
      ['$keys', '$values', '$Name', '$Mark'],
      ['task', '  X  ', ' Иванов ', ''],
      ['save', ' true '],
      ['', '', '   ', ''],
      ['', '', '', ' 5 '],
    ])

    expect(task?.name).toBe('X')
    expect(task?.params).toEqual({ save: 'true' })
    expect(task?.rows).toEqual([
      { name: 'Иванов', mark: '' },
      { name: '', mark: '5' },
    ])
  })

  it('недостающие ячейки в строках короче заголовка считаются пустыми', () => {
    const task = parseTableTask([['$keys', '$values', '$Name', '$Mark'], ['task', 'X', 'Иванов'], ['save']])

    expect(task?.params).toEqual({ save: '' })
    expect(task?.rows).toEqual([{ name: 'Иванов', mark: '' }])
  })

  it('раскладывает колонки $ns.field по пространствам имён независимо от корневых строк', () => {
    const task = parseTableTask([
      ['$keys', '$values', '$Team', '$Iteration.Name', '$Iteration.Begin'],
      ['task', 'X', 'Команда 1', 'Итерация 1', '01.09'],
      ['', '', 'Команда 2', '', ''],
      ['', '', '', 'Итерация 2', '15.09'],
    ])

    expect(task?.columns).toEqual({ team: 2, 'iteration.name': 3, 'iteration.begin': 4 })
    expect(task?.rows).toEqual([{ team: 'Команда 1' }, { team: 'Команда 2' }])
    expect(task?.rowsByNamespace).toEqual({
      iteration: [
        { name: 'Итерация 1', begin: '01.09' },
        { name: 'Итерация 2', begin: '15.09' },
      ],
    })
  })
})
