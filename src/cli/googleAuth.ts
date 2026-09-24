import { googleSecretsPaths, NodeGoogleAuth } from '../apis/NodeGoogleAuth.js'
import { CliError } from './errors.js'

/** Google без интерактивного входа: только сохранённые токены, иначе `CREDENTIALS_MISSING`. */
export async function savedGoogleAuthAsync(): Promise<NodeGoogleAuth> {
  const auth = await NodeGoogleAuth.createAsync('only-saved')
  if (!NodeGoogleAuth.hasSavedTokens()) {
    throw new CliError('CREDENTIALS_MISSING', 'Google: нет сохранённых токенов — выполните google login.', {
      system: 'google',
      files: [googleSecretsPaths.tokens],
    })
  }
  return auth
}
