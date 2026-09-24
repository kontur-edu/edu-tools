import { describe, expect, it } from 'vitest'
import { CredentialsError, NodeCredentials } from '../apis/NodeCredentials'
import { GoogleAuthError, googleSecretsPaths } from '../apis/NodeGoogleAuth'
import { CliError, toCliError } from './errors'
import { renderHumanError, renderJson } from './output'

// Приведение исключений к code + message + details (CLI spec, «Коды ошибок»).

describe('toCliError', () => {
  it('CliError возвращается как есть', () => {
    const error = new CliError('USAGE_ERROR', 'm')
    expect(toCliError(error)).toBe(error)
  })

  it.each([
    ['missing', 'CREDENTIALS_MISSING'],
    ['invalid', 'CREDENTIALS_INVALID'],
  ] as const)('CredentialsError %s → %s, details: system и variables', (kind, code) => {
    const error = toCliError(new CredentialsError(kind, 'brs', 'БРС: сообщение', ['BRS_SID', 'BRS_SID_FILE']))

    expect(error.code).toBe(code)
    expect(error.message).toBe('БРС: сообщение')
    expect(error.details).toEqual({ system: 'brs', variables: ['BRS_SID', 'BRS_SID_FILE'] })
  })

  it.each([
    ['missing-config', 'CREDENTIALS_MISSING', { system: 'google', files: [googleSecretsPaths.projectConfig] }],
    ['invalid-config', 'CREDENTIALS_INVALID', { system: 'google', files: [googleSecretsPaths.projectConfig] }],
    ['no-code', 'LOGIN_CANCELLED', { system: 'google' }],
  ] as const)('GoogleAuthError %s → %s', (kind, code, details) => {
    const error = toCliError(new GoogleAuthError(kind, 'Google: сообщение'))

    expect(error.code).toBe(code)
    expect(error.message).toBe('Google: сообщение')
    expect(error.details).toEqual(details)
  })

  it.each<[string, Error]>([
    ['fetch failed', new TypeError('fetch failed')],
    ['TimeoutError', Object.assign(new Error('timeout'), { name: 'TimeoutError' })],
    ['AbortError', Object.assign(new Error('aborted'), { name: 'AbortError' })],
    ['code ENOTFOUND', Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' })],
    ['cause.code ECONNRESET', Object.assign(new Error('request failed'), { cause: { code: 'ECONNRESET' } })],
  ])('сетевая ошибка (%s) → NETWORK_ERROR с причиной', (_, e) => {
    const error = toCliError(e)

    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.details).toEqual({ reason: e.message })
  })

  it('invalid_grant от Google OAuth → CREDENTIALS_INVALID', () => {
    const error = toCliError(
      Object.assign(new Error('invalid_grant'), { response: { data: { error: 'invalid_grant' } } }),
    )

    expect(error.code).toBe('CREDENTIALS_INVALID')
    expect(error.details).toEqual({ system: 'google', reason: 'invalid_grant' })
  })

  it('прочее исключение → INTERNAL_ERROR, исходное исключение в cause, но не в details', () => {
    const cause = new SyntaxError('Unexpected token <')
    const error = toCliError(cause)

    expect(error.code).toBe('INTERNAL_ERROR')
    expect(error.message).toBe('Unexpected token <')
    expect(error.details).toEqual({})
    expect(error.cause).toBe(cause)
  })

  it('не Error → INTERNAL_ERROR со строковым представлением', () => {
    expect(toCliError('boom')).toMatchObject({ code: 'INTERNAL_ERROR', message: 'boom' })
  })

  it('ошибка с кодом, не относящимся к сети, — не NETWORK_ERROR', () => {
    expect(toCliError(Object.assign(new Error('denied'), { code: 'EACCES' })).code).toBe('INTERNAL_ERROR')
  })
})

describe('ошибка учётных данных в выводе CLI', () => {
  it('значение секрета из файла не попадает ни в human, ни в JSON вывод', () => {
    const secret = 'secret-sid-value'
    const credentials = new NodeCredentials({
      env: { BRS_SID_FILE: 'secrets/brs.json' },
      readFile: () => JSON.stringify({ petrov: { sid: secret }, ivanov: { sid: secret } }),
    })
    const error = toCliError(catchError(() => credentials.get('brs')))

    expect(error.code).toBe('CREDENTIALS_INVALID')
    expect(renderHumanError(error)).not.toContain(secret)
    expect(renderJson('auth check', error)).not.toContain(secret)
  })
})

function catchError(action: () => unknown): unknown {
  try {
    action()
  } catch (e) {
    return e
  }
  throw new Error('ожидалось исключение')
}
