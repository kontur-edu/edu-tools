# ADR-0007 — Vitest как тестовый раннер
Status: Active (2026-09-24)

### Context
В EP-002 нужен `npm test` для unit-тестов общего `src/`. Этот код собирают и `tsc`, и CRA. Ограничения:
- код на TypeScript и ESM, относительные импорты пишутся без расширения; в Node такой код запускается только через `loader.js`;
- `react-scripts test` (Jest из CRA 4/5) плохо дружит с ESM-зависимостями и Node-кодом (риск из EP-002). Кроме того, CRA больше не развивается, а в roadmap стоит переезд на Vite;
- тестовые файлы не должны попадать ни в `npm run build`, ни в `npm run web-build`.

Кандидаты: Vitest и `node:test`. `node:test` не обходится без сборки или загрузчика TypeScript: встроенный strip-types не резолвит импорты без расширения и не поддерживает `enum`. Пришлось бы тащить `tsx`/`ts-node` и настраивать отдельный конвейер.

### Decision
Раннер — Vitest (`vitest run` за `npm test`), вместе с явной dev-зависимостью `vite`. Тесты лежат рядом с модулем и называются `src/**/<module>.test.ts`. Однотипные модули одной папки можно проверять одним групповым файлом в той же папке (пример — `src/apis/UrlProviders.test.ts` для всех `*UrlProvider`). Из сборки `tsc` их исключает `tsconfig.json`, типы тестов проверяет `npm run typecheck` (`tsconfig.test.json`).

### Consequences
- Плюсы: TS, ESM и импорты без расширения работают без настройки; один прогон занимает доли секунды. Vitest — раннер экосистемы Vite, поэтому после переезда web на Vite конфиг раннера можно будет объединить с конфигом сборки, а тесты не придётся переписывать. API совместим с Jest (`describe`/`it`/`expect`, `vi.fn`), что пригодится для фейков в FT-0007.
- Минусы / принятые риски: Vitest 5 и Vite 8 требуют Node ≥ 22.12 (ветки 22.12+, 24, 26+), поэтому поднят `engines` в `package.json` (`>=22.12.0`). `vite` объявлен у Vitest как peer-зависимость, а с `--legacy-peer-deps` npm peer-зависимости не ставит, поэтому `vite` указан в `devDependencies` явно. Vitest не проверяет типы, для этого есть отдельный `npm run typecheck`.
- Ограничения на будущее: `react-scripts test` (`web-test`) удалён, Jest в проекте не используется. Тестовые файлы с другим суффиксом (`.spec.ts`, `.test.tsx`) раннер не увидит, пока не расширен `include` в `vitest.config.ts`. Этот же `include` нужно учесть и в `tsconfig.json` `exclude`.

### Links
- [EP-002](../plans/epics/EP-002-automated-tests.md): эпик автотестов и риск про CRA-раннер. Читать, чтобы видеть, какие фичи опираются на раннер.
- [FT-0006](../plans/features/FT-0006-unit-test-infrastructure.md): фича, в которой внедрён раннер. Читать, чтобы видеть сценарий приёмки.
- [Stack & tooling](../spec/project/stack-and-tooling.md): команды `npm test` / `npm run typecheck` и состав pre-commit. Читать перед изменением конфигурации тестов.
- [Roadmap](../plans/roadmap.md): переезд с CRA на Vite. Читать, чтобы понимать, почему выбран Vitest.
