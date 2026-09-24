import { describe, expect, it } from 'vitest'
import { CredentialsError, NodeCredentials } from '../../apis/NodeCredentials'
import { AuthProbe, AuthSystem, authSystems, checkSystemsAsync } from './authCheck'

// auth check (CLI spec, «auth check»): статус системы по результату фейковой пробы, без сети.

const SECRET = 'secret-sid-value'

const okProbe: AuthProbe = async () => true
const rejectingProbe =
  (error: unknown): AuthProbe =>
  async () => {
    throw error
  }

function probes(overrides: Partial<Record<AuthSystem, AuthProbe>> = {}): Record<AuthSystem, AuthProbe> {
  const all = Object.fromEntries(authSystems.map((system) => [system, okProbe])) as Record<AuthSystem, AuthProbe>
  return { ...all, ...overrides }
}

async function checkOne(system: AuthSystem, probe: AuthProbe) {
  const [check] = await checkSystemsAsync([system], probes({ [system]: probe }))
  return check
}

describe('checkSystemsAsync', () => {
  it('проверяет только переданные системы, в их порядке', async () => {
    const checks = await checkSystemsAsync(['its', 'brs'], probes())
    expect(checks.map((c) => c.system)).toEqual(['its', 'brs'])
  })

  it('проба вернула true → ok', async () => {
    const check = await checkOne('brs', okProbe)
    expect(check).toMatchObject({ system: 'brs', title: 'БРС', status: 'ok' })
    expect(check.code).toBeUndefined()
  })

  it('проба вернула false → invalid, CREDENTIALS_INVALID', async () => {
    const check = await checkOne('google', async () => false)
    expect(check).toMatchObject({ system: 'google', title: 'Google', status: 'invalid', code: 'CREDENTIALS_INVALID' })
  })

  it('нет учётных данных → missing, CREDENTIALS_MISSING, имена переменных', async () => {
    const credentials = new NodeCredentials({ env: {}, readFile: () => '' })
    const check = await checkOne('its', async () => Boolean(credentials.itsAuth()))

    expect(check).toMatchObject({
      status: 'missing',
      code: 'CREDENTIALS_MISSING',
      details: { system: 'its', variables: ['ITS_AUTH', 'ITS_AUTH_FILE'] },
    })
  })

  it('secrets/brs.json с секретом, но без sid → invalid, значение секрета не выводится', async () => {
    const credentials = new NodeCredentials({
      env: { BRS_SID_FILE: 'secrets/brs.json' },
      readFile: () => JSON.stringify({ ivanov: { password: SECRET } }),
    })
    const check = await checkOne('brs', async () => Boolean(credentials.brsAuth()))

    expect(check).toMatchObject({ status: 'invalid', code: 'CREDENTIALS_INVALID', details: { system: 'brs' } })
    expect(JSON.stringify(check)).not.toContain(SECRET)
  })

  it('неверный файл учётных данных → invalid, CREDENTIALS_INVALID', async () => {
    const check = await checkOne(
      'brs',
      rejectingProbe(new CredentialsError('invalid', 'brs', 'БРС: файл', ['BRS_SID_FILE'])),
    )
    expect(check).toMatchObject({
      status: 'invalid',
      code: 'CREDENTIALS_INVALID',
      details: { variables: ['BRS_SID_FILE'] },
    })
  })

  it('сетевая ошибка → unreachable, NETWORK_ERROR', async () => {
    const check = await checkOne('teamproject', rejectingProbe(new TypeError('fetch failed')))
    expect(check).toMatchObject({ status: 'unreachable', code: 'NETWORK_ERROR', details: { reason: 'fetch failed' } })
    expect(check.message).toContain('TeamProject')
  })

  it.each([
    ['JSON не разбирается', new SyntaxError('Unexpected token <')],
    ['БРС … is Forbidden', new Error('https://brs.urfu.ru/mrd/ is Forbidden')],
  ])('ответ страницей входа (%s) → invalid, причина в details', async (_, error) => {
    const check = await checkOne('partner', rejectingProbe(error))
    expect(check).toMatchObject({ status: 'invalid', code: 'CREDENTIALS_INVALID', details: { reason: error.message } })
  })

  it('прочее исключение → error, INTERNAL_ERROR, причина в details.reason', async () => {
    const check = await checkOne('its', rejectingProbe(new Error('Cannot read properties of undefined')))
    expect(check).toMatchObject({
      status: 'error',
      code: 'INTERNAL_ERROR',
      details: { reason: 'Cannot read properties of undefined' },
    })
  })

  it('упавшая проба одной системы не влияет на остальные', async () => {
    const checks = await checkSystemsAsync(authSystems, probes({ brs: rejectingProbe(new TypeError('fetch failed')) }))
    expect(checks.map((c) => [c.system, c.status])).toEqual([
      ['brs', 'unreachable'],
      ['its', 'ok'],
      ['teamproject', 'ok'],
      ['partner', 'ok'],
      ['google', 'ok'],
    ])
  })
})
