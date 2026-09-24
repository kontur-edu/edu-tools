import { defineConfig } from 'vitest/config'

// Unit-тесты лежат рядом с кодом: src/**/<module>.test.ts (см. ADR-0007).
// include ограничен src/, чтобы не подхватывать тесты brs-extensions/ и cors-proxy/.
// Офлайн-сценарии (*.scenario.test.ts) запускают собранный CLI процессом: сборка — один раз в globalSetup.
// Живые сценарии (*.live.test.ts) — только npm run test:integration (vitest.live.config.ts).
export default defineConfig({
  test: {
    environment: 'node',
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.scenario.test.ts', 'src/**/*.live.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'scenarios',
          include: ['src/**/*.scenario.test.ts'],
          globalSetup: ['src/testing/buildCli.globalSetup.ts'],
          testTimeout: 30_000,
        },
      },
    ],
  },
})
