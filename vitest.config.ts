import { defineConfig } from 'vitest/config'

// Unit-тесты лежат рядом с кодом: src/**/<module>.test.ts (см. ADR-0007).
// include ограничен src/, чтобы не подхватывать тесты brs-extensions/ и cors-proxy/.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
