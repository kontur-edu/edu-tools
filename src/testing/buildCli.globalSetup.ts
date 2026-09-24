import { buildCliAsync } from './cliProcess'

// Только для тестов. globalSetup Vitest для сценариев: CLI собирается один раз на прогон, а не на каждый сценарий.
export default async function setup() {
  await buildCliAsync()
}
