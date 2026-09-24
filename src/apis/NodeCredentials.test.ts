import { describe, expect, it } from 'vitest'
import { CredentialsError, NodeCredentials } from './NodeCredentials'

// Правила NodeCredentials (Stack & tooling): переменная → файл из *_FILE → CredentialsError.
// Окружение и файлы подставляются в тесте: реальные .env и secrets/ не читаются.

const SECRET = 'secret-sid-value'

function fakeCredentials(env: Record<string, string | undefined>, files: Record<string, string> = {}) {
  return new NodeCredentials({
    env,
    readFile: (filePath) => {
      if (!(filePath in files)) throw new Error(`ENOENT: ${filePath}`)
      return files[filePath]
    },
  })
}

/** Ловит CredentialsError и заодно проверяет, что значение секрета не попало в текст ошибки. */
function credentialsError(action: () => unknown): CredentialsError {
  try {
    action()
  } catch (e) {
    expect(e).toBeInstanceOf(CredentialsError)
    const error = e as CredentialsError
    expect(error.message).not.toContain(SECRET)
    return error
  }
  throw new Error('ожидалась CredentialsError')
}

describe('NodeCredentials.get', () => {
  it('значение из переменной, пробелы по краям обрезаются', () => {
    expect(fakeCredentials({ BRS_SID: `  ${SECRET}\n` }).get('brs')).toBe(SECRET)
  })

  it('переменная важнее файла', () => {
    const creds = fakeCredentials(
      { ITS_AUTH: SECRET, ITS_AUTH_FILE: 'secrets/its.txt' },
      { 'secrets/its.txt': 'other' },
    )
    expect(creds.get('its')).toBe(SECRET)
  })

  it('нет значения: kind = missing, имена переменной и *_FILE', () => {
    const error = credentialsError(() => fakeCredentials({ TEAMPROJECT_JWT: '  ' }).get('teamproject'))

    expect(error.kind).toBe('missing')
    expect(error.system).toBe('teamproject')
    expect(error.variables).toEqual(['TEAMPROJECT_JWT', 'TEAMPROJECT_JWT_FILE'])
    expect(error.message).toContain('TEAMPROJECT_JWT')
    expect(error.message).toContain('TEAMPROJECT_JWT_FILE')
  })

  it('значение из файла по пути из *_FILE', () => {
    const creds = fakeCredentials(
      { PARTNER_COOKIE_FILE: 'secrets/partner.txt' },
      { 'secrets/partner.txt': `${SECRET}\n` },
    )
    expect(creds.get('partner')).toBe(SECRET)
  })

  it('пустой файл: kind = missing, переменная *_FILE', () => {
    const error = credentialsError(() =>
      fakeCredentials({ BRS_SID_FILE: 'secrets/brs.sid' }, { 'secrets/brs.sid': ' \n' }).get('brs'),
    )

    expect(error.kind).toBe('missing')
    expect(error.variables).toEqual(['BRS_SID_FILE'])
  })

  it('файл не читается: kind = invalid, переменная *_FILE', () => {
    const error = credentialsError(() => fakeCredentials({ ITS_AUTH_FILE: 'secrets/nope.txt' }).get('its'))

    expect(error.kind).toBe('invalid')
    expect(error.system).toBe('its')
    expect(error.variables).toEqual(['ITS_AUTH_FILE'])
    expect(error.message).toContain('secrets/nope.txt')
  })
})

// В файлах ниже у записей лежит SECRET: credentialsError проверяет, что он не попал в ошибку.
describe('NodeCredentials.get: secrets/brs.json', () => {
  const brsJson = (entries: unknown) => ({ 'secrets/brs.json': JSON.stringify(entries) })
  const env = (extra: Record<string, string> = {}) => ({ BRS_SID_FILE: 'secrets/brs.json', ...extra })

  it('запись выбирается по BRS_USER', () => {
    const creds = fakeCredentials(
      env({ BRS_USER: 'ivanov' }),
      brsJson({ petrov: { sid: 'other' }, ivanov: { sid: SECRET } }),
    )
    expect(creds.get('brs')).toBe(SECRET)
  })

  it('единственная запись берётся без BRS_USER', () => {
    expect(fakeCredentials(env(), brsJson({ ivanov: { sid: ` ${SECRET} ` } })).get('brs')).toBe(SECRET)
  })

  it('несколько записей без BRS_USER: kind = invalid, BRS_USER', () => {
    const error = credentialsError(() =>
      fakeCredentials(env(), brsJson({ petrov: { sid: SECRET }, ivanov: { sid: SECRET } })).get('brs'),
    )

    expect(error.kind).toBe('invalid')
    expect(error.variables).toEqual(['BRS_USER'])
  })

  it('нет записи из BRS_USER: kind = invalid, BRS_USER', () => {
    const error = credentialsError(() =>
      fakeCredentials(env({ BRS_USER: 'sidorov' }), brsJson({ ivanov: { sid: SECRET } })).get('brs'),
    )

    expect(error.kind).toBe('invalid')
    expect(error.variables).toEqual(['BRS_USER'])
  })

  it('запись без sid: kind = invalid, BRS_SID_FILE', () => {
    const error = credentialsError(() =>
      fakeCredentials(env(), brsJson({ ivanov: { login: 'ivanov', password: SECRET } })).get('brs'),
    )

    expect(error.kind).toBe('invalid')
    expect(error.variables).toEqual(['BRS_SID_FILE'])
  })

  it.each([
    ['не JSON', `{ "ivanov": { "sid": "${SECRET}" `],
    ['не объект', 'null'],
  ])('неверный файл (%s): kind = invalid, BRS_SID_FILE', (_, content) => {
    const error = credentialsError(() => fakeCredentials(env(), { 'secrets/brs.json': content }).get('brs'))

    expect(error.kind).toBe('invalid')
    expect(error.variables).toEqual(['BRS_SID_FILE'])
  })
})
