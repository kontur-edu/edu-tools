import * as fs from 'fs'
import { Credentials, OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'
import * as readline from 'readline'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const TOKENS_PATH = './secrets/google-tokens.json'
const PROJECT_CONFIG_PATH = './secrets/google.json'

export const googleSecretsPaths = { projectConfig: PROJECT_CONFIG_PATH, tokens: TOKENS_PATH }

export type AuthorizePolicy = 'always-new' | 'ask' | 'ask-if-not-saved' | 'only-saved'

/** `missing-config` / `invalid-config` — нет или не читается `secrets/google.json`; `no-code` — код авторизации не введён. */
export type GoogleAuthErrorKind = 'missing-config' | 'invalid-config' | 'no-code'

export class GoogleAuthError extends Error {
  readonly kind: GoogleAuthErrorKind

  constructor(kind: GoogleAuthErrorKind, message: string) {
    super(message)
    this.name = 'GoogleAuthError'
    this.kind = kind
  }
}

export class NodeGoogleAuth {
  authClient: OAuth2Client

  constructor(authClient: OAuth2Client) {
    this.authClient = authClient
  }

  static async createAsync(policy: AuthorizePolicy): Promise<NodeGoogleAuth> {
    const authClient = await authorizeAsync(policy)
    return new NodeGoogleAuth(authClient)
  }

  /** Installed-app flow с обязательным вводом кода: новые токены сохраняются в `secrets/`. */
  static async loginAsync(): Promise<NodeGoogleAuth> {
    const authClient = createAuthClient()
    const code = await askCodeAsync(authClient, 'Enter the code from that page here: ')
    if (!code) {
      throw new GoogleAuthError('no-code', 'Код авторизации не введён, токены не изменены.')
    }
    const response = await authClient.getToken(code)
    saveTokens(response.tokens)
    authClient.setCredentials(response.tokens)
    return new NodeGoogleAuth(authClient)
  }

  static hasSavedTokens(): boolean {
    return loadTokens() !== null
  }
}

async function authorizeAsync(policy: AuthorizePolicy) {
  const authClient = createAuthClient()

  if (policy === 'always-new') {
    clearTokens()
  }

  const savedTokens = loadTokens()

  if (policy === 'only-saved') {
    if (savedTokens) {
      authClient.setCredentials(savedTokens)
    }
    return authClient
  }

  if (policy === 'ask-if-not-saved' && savedTokens) {
    authClient.setCredentials(savedTokens)
    return authClient
  }

  const code = await askCodeAsync(
    authClient,
    'Just enter to use saved tokens or enter the code from that page here to get new tokens: ',
  )

  if (code) {
    const response = await authClient.getToken(code)
    saveTokens(response.tokens)
    authClient.setCredentials(response.tokens)
    return authClient
  }

  if (savedTokens) {
    authClient.setCredentials(savedTokens)
  }
  return authClient
}

function createAuthClient(): OAuth2Client {
  const { client_secret: clientSecret, client_id: clientId, redirect_uris: redirectUris } = loadProjectConfig().installed

  const authClient = new google.auth.OAuth2(clientId, clientSecret, redirectUris[0])
  authClient.on('tokens', (tokens) => {
    const currentTokens = loadTokens()
    saveTokens({ ...currentTokens, ...tokens })
  })
  return authClient
}

function loadProjectConfig(): ProjectConfig {
  if (!fs.existsSync(PROJECT_CONFIG_PATH)) {
    throw new GoogleAuthError(
      'missing-config',
      `Google: нет файла ${PROJECT_CONFIG_PATH} с OAuth client (образец — secrets.sample/google.json).`,
    )
  }
  try {
    const config = JSON.parse(fs.readFileSync(PROJECT_CONFIG_PATH, 'utf8')) as ProjectConfig
    if (!config?.installed?.client_id || !config.installed.redirect_uris?.length) {
      throw new Error('no installed client')
    }
    return config
  } catch {
    throw new GoogleAuthError(
      'invalid-config',
      `Google: файл ${PROJECT_CONFIG_PATH} не является OAuth client вида { "installed": { ... } }.`,
    )
  }
}

// Подсказки пишутся в stderr: stdout CLI в режиме --json занят только JSON.
function askCodeAsync(authClient: OAuth2Client, question: string): Promise<string> {
  const authUrl = authClient.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  })
  console.error('Authorize this app by visiting this url:', authUrl)
  console.error()

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
    })
    rl.question(question, (code) => {
      rl.close()
      resolve(code.trim())
    })
  })
}

function clearTokens() {
  if (fs.existsSync(TOKENS_PATH)) {
    fs.unlinkSync(TOKENS_PATH)
  }
}

function saveTokens(tokens: Credentials) {
  const json = JSON.stringify({ ...tokens, updated: new Date().toString() })
  fs.writeFileSync(TOKENS_PATH, json, { encoding: 'utf8' })
}

function loadTokens(): Credentials | null {
  if (!fs.existsSync(TOKENS_PATH)) {
    return null
  }

  const content = fs.readFileSync(TOKENS_PATH, 'utf8')
  if (!content) {
    return null
  }

  const tokens = JSON.parse(content) as Credentials
  if (!tokens) {
    return null
  }

  return tokens
}

interface ProjectConfig {
  installed: ProjectCredentials
}

interface ProjectCredentials {
  client_secret: string
  client_id: string
  redirect_uris: string[]
}
