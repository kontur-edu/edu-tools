# FT-0006 — Unit-инфраструктура
Status: Draft (2026-09-24)

## Feature FT-0006 — Unit-инфраструктура
Epic: `EP-002`. Status: `Done`.
Triage: `ready-for-agent`.

### User value
Разработчик и ИИ-агент запускают `npm test` и за секунды узнают, не сломаны ли правила в чистых функциях. Тесты идут на каждом коммите вместе с lint. Новые модули (CSV codec, парсер задания из FT-0015) сразу пишутся с тестами.

### Deliverables
- Тестовый раннер для Node-кода на TypeScript/ESM; выбор фиксируется в ADR (кандидаты — Vitest и `node:test`; учесть будущий переезд с CRA на Vite из roadmap). `react-scripts test` не используется.
- Скрипт `npm test` (однократный прогон, ненулевой exit code при падении) и вызов `npm test` в `.husky/pre-commit` после `lint`.
- Соглашение о расположении и именовании тестов; тесты не попадают ни в `npm run build` (`tsc` → `build/`), ни в `npm run web-build`, а ESLint их проверяет.
- Первые тесты на чистые хелперы: нормализация и сравнение строк, `parseAnyFloat` (`src/helpers/tools.ts`), ФИО (`src/helpers/fio.ts`), даты (`JustDate`), построение URL провайдерами систем (`*UrlProvider`).

### Context (SSoT links)
- [EP-002](../epics/EP-002-automated-tests.md): риск «CRA-раннер плохо подходит для Node-кода». Читать, чтобы выбор раннера закрыл этот риск.
- [Stack & tooling](../../spec/project/stack-and-tooling.md): ESM, `loader.js`, CRA и `tsc` собирают общий `src/`, pre-commit. Читать, чтобы раннер не конфликтовал со сборками.
- [Roadmap](../roadmap.md): переезд на Vite. Читать, чтобы выбор раннера не пришлось переделывать.
- [FT-0015](FT-0015-grid-parser-and-csv-source.md): первая фича, которая ждёт `npm test`. Читать, чтобы инфраструктура подошла для тестов codec и парсера на in-memory сетках.

### Implementation plan
- Сначала ADR с выбором раннера, затем конфиг и `npm test`.
- Проверить, что тестовые файлы исключены из `tsconfig` для сборки (или вынесены), а CRA их не подхватывает.
- Тесты на хелперы фиксируют текущее поведение (характеризационные), без изменения кода хелперов.

### Scenarios (acceptance)
#### Setup
- Свежий clone, `npm ci --legacy-peer-deps`.
- Actors: разработчик / ИИ-агент.

#### Action
- `npm test`; затем сломать проверяемое поведение хелпера и выполнить `npm test` и коммит.

#### Assert
- `npm test` проходит, exit code 0; при сломанном хелпере — ненулевой exit code, коммит отклоняется хуком.
- `npm run build` и `npm run web-build` зелёные, в `build/` нет тестовых файлов.

### Tests
- Unit: хелперы из Deliverables.

### Definition of done
По [Feature template](../../mbb/templates/feature.md); дополнительно `npm test`, `npm run build`, `npm run web-build`, `npm run lint` зелёные.

### Docs updates (SSoT)
- Новый ADR о выборе раннера + строка в [ADR index](../../adr/index.md).
- [Stack & tooling](../../spec/project/stack-and-tooling.md) — раннер, `npm test`, состав pre-commit; убрать «Автотестов нет».
- [Verification matrix](../verification-matrix.md) — `npm test` в базовых проверках.
