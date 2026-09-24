import { CredentialsError } from '../apis/NodeCredentials.js'
import { GoogleAuthError, googleSecretsPaths } from '../apis/NodeGoogleAuth.js'

/** Стабильные коды ошибок CLI; перечень и смысл — в CLI spec. */
export type CliErrorCode =
  | 'USAGE_ERROR'
  | 'CREDENTIALS_MISSING'
  | 'CREDENTIALS_INVALID'
  | 'NETWORK_ERROR'
  | 'LOGIN_CANCELLED'
  | 'TASK_SOURCE_INVALID'
  | 'INTERNAL_ERROR'

export type CliErrorDetails = Record<string, unknown>

export class CliError extends Error {
  readonly code: CliErrorCode
  readonly details: CliErrorDetails
  /** Исходное исключение, если ошибка получена из него; в вывод не попадает. */
  readonly cause?: unknown

  constructor(code: CliErrorCode, message: string, details: CliErrorDetails = {}, cause?: unknown) {
    super(message)
    this.name = 'CliError'
    this.code = code
    this.details = details
    this.cause = cause
  }
}

/** Приводит любое исключение к `code + message + details`. Значения секретов в результат не попадают. */
export function toCliError(error: unknown): CliError {
  if (error instanceof CliError) return error

  if (error instanceof CredentialsError) {
    const code = error.kind === 'missing' ? 'CREDENTIALS_MISSING' : 'CREDENTIALS_INVALID'
    return new CliError(code, error.message, { system: error.system, variables: error.variables })
  }

  if (error instanceof GoogleAuthError) {
    const files = [googleSecretsPaths.projectConfig]
    switch (error.kind) {
      case 'missing-config':
        return new CliError('CREDENTIALS_MISSING', error.message, { system: 'google', files })
      case 'invalid-config':
        return new CliError('CREDENTIALS_INVALID', error.message, { system: 'google', files })
      case 'no-code':
        return new CliError('LOGIN_CANCELLED', error.message, { system: 'google' })
    }
  }

  if (isNetworkError(error)) {
    return new CliError('NETWORK_ERROR', 'Система недоступна: сетевая ошибка или таймаут.', {
      reason: errorMessage(error),
    })
  }

  if (isOAuthGrantError(error)) {
    return new CliError('CREDENTIALS_INVALID', 'Google не принял код или сохранённые токены: выполните google login.', {
      system: 'google',
      reason: 'invalid_grant',
    })
  }

  return new CliError('INTERNAL_ERROR', errorMessage(error), {}, error)
}

const networkErrorCodes = [
  'ENOTFOUND',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
]

/** fetch (undici) бросает `TypeError: fetch failed`, таймаут — `TimeoutError`; gaxios — ошибку с `code`. */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.name === 'TimeoutError' || error.name === 'AbortError') return true
  if (error instanceof TypeError && error.message === 'fetch failed') return true
  const { code: ownCode, cause } = error as { code?: unknown; cause?: { code?: unknown } }
  const code = ownCode ?? cause?.code
  return typeof code === 'string' && networkErrorCodes.includes(code)
}

function isOAuthGrantError(error: unknown): boolean {
  const data = (error as { response?: { data?: { error?: unknown } } } | null)?.response?.data
  return data?.error === 'invalid_grant'
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
