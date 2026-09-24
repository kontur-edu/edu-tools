import { defineConfig } from 'vitest/config'

// Живые сценарии: собранный CLI в try против реальных систем УрФУ (npm run test:integration).
// Без учётных данных системы сценарий пропускается с именами недостающих переменных.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.live.test.ts'],
    globalSetup: ['src/testing/buildCli.globalSetup.ts'],
    testTimeout: 120_000,
    // verbose печатает причину пропуска: каких переменных не хватает.
    reporters: ['verbose'],
    // Один сценарий за раз: не нагружать системы УрФУ параллельными запросами.
    fileParallelism: false,
  },
})
