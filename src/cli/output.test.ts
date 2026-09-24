import { describe, expect, it } from 'vitest'
import { CliError } from './errors'
import { CommandOutput, exitCodeFor, renderHumanError, renderJson } from './output'

// Вывод и коды выхода CLI (CLI spec, «Вывод и коды выхода»).

const output: CommandOutput = { ok: true, message: 'Готово.', result: { rows: 2 }, text: 'текст' }

describe('renderJson', () => {
  it('итог команды: { command, ok, message, result }, без text', () => {
    expect(JSON.parse(renderJson('auth check', output))).toEqual({
      command: 'auth check',
      ok: true,
      message: 'Готово.',
      result: { rows: 2 },
    })
  })

  it('ошибка: { command, ok: false, message, error: { code, message, details } }', () => {
    const error = new CliError('CREDENTIALS_MISSING', 'нет данных', { system: 'its', variables: ['ITS_AUTH'] })

    expect(JSON.parse(renderJson(null, error))).toEqual({
      command: null,
      ok: false,
      message: 'нет данных',
      error: {
        code: 'CREDENTIALS_MISSING',
        message: 'нет данных',
        details: { system: 'its', variables: ['ITS_AUTH'] },
      },
    })
  })

  it('исходное исключение ошибки в JSON не попадает', () => {
    const error = new CliError('INTERNAL_ERROR', 'сбой', {}, new Error('secret-in-cause'))
    expect(renderJson('task run', error)).not.toContain('secret-in-cause')
  })

  it('один JSON-объект с переводом строки в конце', () => {
    const text = renderJson('x', output)
    expect(text.endsWith('}\n')).toBe(true)
    expect(() => JSON.parse(text)).not.toThrow()
  })
})

describe('renderHumanError', () => {
  it('строка с кодом и сообщением, затем details по строке; массивы через запятую', () => {
    const error = new CliError('CREDENTIALS_MISSING', 'ИТС: учётные данные не заданы.', {
      system: 'its',
      variables: ['ITS_AUTH', 'ITS_AUTH_FILE'],
      count: 3,
    })

    expect(renderHumanError(error)).toBe(
      'Ошибка CREDENTIALS_MISSING: ИТС: учётные данные не заданы.\n' +
        '  system: its\n' +
        '  variables: ITS_AUTH, ITS_AUTH_FILE\n' +
        '  count: 3\n',
    )
  })

  it('без details — одна строка', () => {
    expect(renderHumanError(new CliError('USAGE_ERROR', 'нет аргумента'))).toBe('Ошибка USAGE_ERROR: нет аргумента\n')
  })
})

describe('exitCodeFor', () => {
  it.each<[string, CommandOutput | CliError, number]>([
    ['ok', output, 0],
    ['не ok', { ...output, ok: false }, 1],
    ['USAGE_ERROR', new CliError('USAGE_ERROR', 'm'), 2],
    ['CREDENTIALS_MISSING', new CliError('CREDENTIALS_MISSING', 'm'), 1],
    ['INTERNAL_ERROR', new CliError('INTERNAL_ERROR', 'm'), 1],
  ])('%s → %i', (_, outcome, code) => {
    expect(exitCodeFor(outcome)).toBe(code)
  })
})
