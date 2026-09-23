import * as fs from 'fs'
import * as path from 'path'
import 'dotenv/config'
import { BrsAuth } from './BrsAuth.js'
import { ItsAuthV2 } from './ItsAuthV2.js'
import { PartnerAuth } from './PartnerAuth.js'
import { TeamProjectAuthV2 } from './TeamProjectAuthV2.js'

export type CredentialsSystem = 'brs' | 'its' | 'teamproject' | 'partner'

type SystemInfo = {
  title: string
  variable: string
  fileVariable: string
}

export const credentialsSystems: Record<CredentialsSystem, SystemInfo> = {
  brs: { title: 'БРС', variable: 'BRS_SID', fileVariable: 'BRS_SID_FILE' },
  its: { title: 'ИТС', variable: 'ITS_AUTH', fileVariable: 'ITS_AUTH_FILE' },
  teamproject: { title: 'TeamProject', variable: 'TEAMPROJECT_JWT', fileVariable: 'TEAMPROJECT_JWT_FILE' },
  partner: { title: 'Partner', variable: 'PARTNER_COOKIE', fileVariable: 'PARTNER_COOKIE_FILE' },
}

const BRS_USER_VARIABLE = 'BRS_USER'

/** `missing` — учётные данные не заданы; `invalid` — файл из `*_FILE` не читается или имеет неверный формат. */
export type CredentialsErrorKind = 'missing' | 'invalid'

export class CredentialsError extends Error {
  readonly kind: CredentialsErrorKind
  readonly system: CredentialsSystem
  readonly variables: string[]

  constructor(kind: CredentialsErrorKind, system: CredentialsSystem, message: string, variables: string[]) {
    super(message)
    this.name = 'CredentialsError'
    this.kind = kind
    this.system = system
    this.variables = variables
  }
}

export type CredentialsEnvironment = {
  env: Record<string, string | undefined>
  readFile: (filePath: string) => string
}

/**
 * Единая точка чтения учётных данных внешних систем для Node-кода.
 * Значение берётся из переменной (например, `BRS_SID`), иначе из файла,
 * путь к которому задан переменной `*_FILE` (например, `BRS_SID_FILE=secrets/brs.sid`).
 * Для БРС файл может быть в формате `secrets/brs.json`: тогда запись выбирается переменной `BRS_USER`.
 * Значения секретов не попадают в сообщения об ошибках.
 */
export class NodeCredentials {
  private readonly environment: CredentialsEnvironment

  constructor(environment: CredentialsEnvironment) {
    this.environment = environment
  }

  static fromProcess(): NodeCredentials {
    return new NodeCredentials({
      env: process.env,
      readFile: (filePath) => fs.readFileSync(filePath, 'utf8'),
    })
  }

  get(system: CredentialsSystem): string {
    const { title, variable, fileVariable } = credentialsSystems[system]
    const value = nonEmpty(this.environment.env[variable])
    if (value) return value

    const filePath = nonEmpty(this.environment.env[fileVariable])
    if (!filePath) {
      throw new CredentialsError(
        'missing',
        system,
        `${title}: учётные данные не заданы. Задайте переменную ${variable} в .env или окружении ` +
          `либо ${fileVariable} — путь к файлу в secrets/.`,
        [variable, fileVariable],
      )
    }

    const content = this.readFile(system, filePath)
    const fileValue =
      system === 'brs' && path.extname(filePath).toLowerCase() === '.json'
        ? this.readBrsSidFromJson(filePath, content)
        : nonEmpty(content)
    if (!fileValue) {
      throw new CredentialsError('missing', system, `${title}: файл ${filePath} из ${fileVariable} пуст.`, [
        fileVariable,
      ])
    }
    return fileValue
  }

  brsAuth(): BrsAuth {
    return new BrsAuth(this.get('brs'))
  }

  itsAuth(): ItsAuthV2 {
    return new ItsAuthV2(this.get('its'))
  }

  teamProjectAuth(): TeamProjectAuthV2 {
    return new TeamProjectAuthV2(this.get('teamproject'))
  }

  partnerAuth(): PartnerAuth {
    return new PartnerAuth(this.get('partner'))
  }

  private readFile(system: CredentialsSystem, filePath: string): string {
    const { title, fileVariable } = credentialsSystems[system]
    try {
      return this.environment.readFile(filePath)
    } catch {
      throw new CredentialsError(
        'invalid',
        system,
        `${title}: не удалось прочитать файл ${filePath} из ${fileVariable}.`,
        [fileVariable],
      )
    }
  }

  private readBrsSidFromJson(filePath: string, content: string): string | null {
    const { fileVariable } = credentialsSystems.brs
    const fail = (reason: string, variables: string[]) =>
      new CredentialsError('invalid', 'brs', `БРС: ${reason} (файл ${filePath}).`, variables)

    let entries: Record<string, { sid?: unknown } | undefined>
    try {
      entries = JSON.parse(content)
    } catch {
      throw fail('файл не является корректным JSON', [fileVariable])
    }
    if (!entries || typeof entries !== 'object') {
      throw fail('ожидается объект вида { "<имя>": { "sid": "..." } }', [fileVariable])
    }

    const names = Object.keys(entries)
    const user = nonEmpty(this.environment.env[BRS_USER_VARIABLE])
    if (!user && names.length !== 1) {
      throw fail(`задайте ${BRS_USER_VARIABLE} — имя записи из файла: ${names.join(', ')}`, [BRS_USER_VARIABLE])
    }

    const name = user ?? names[0]
    const entry = entries[name]
    if (!entry) {
      throw fail(`нет записи ${name} из ${BRS_USER_VARIABLE}`, [BRS_USER_VARIABLE])
    }
    if (typeof entry.sid !== 'string' || !nonEmpty(entry.sid)) {
      throw fail(`у записи ${name} нет поля sid (вход по логину и паролю здесь не поддерживается)`, [fileVariable])
    }
    return entry.sid.trim()
  }
}

function nonEmpty(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
