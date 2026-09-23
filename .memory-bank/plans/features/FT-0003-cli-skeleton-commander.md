# FT-0003 — Каркас CLI на Commander
Status: Draft (2026-09-23)

## Feature FT-0003 — Каркас CLI на Commander
Epic: `EP-001`. Status: `Planned`.
Triage: `ready-for-agent`.
Blocked by: FT-0001.

### User value
Разработчик и ИИ-агент получают одну точку входа вместо раскомментирования строк в `src/main.ts`: `--help` объясняет команды с примерами, `--json` даёт машиночитаемый ответ, код выхода говорит об успехе. Первые полезные команды — проверить учётные данные систем и войти в Google.

### Deliverables
- Точка входа CLI на Commander вместо `src/main.ts`; npm-скрипт запуска (сборка + запуск), по аналогии с текущим `npm start`.
- Общие правила для всех команд: human output по умолчанию, `--json` (в stdout только JSON), ошибки `code + message + details`, ненулевой код выхода при ошибке, `--help` с примерами у каждой команды.
- `auth check [--system <brs|its|teamproject|partner|google>]` — пробный запрос к каждой (или выбранной) системе с учётными данными из FT-0001; результат по системам: `ok` / `missing` / `invalid`.
- `google login` — installed-app flow `NodeGoogleAuth`, сохранение токенов в `secrets/`.
- Функции из `src/main.ts`, не вошедшие в CLI (например, `cloneProjects`), удаляются или остаются отдельно, но не вызываются по умолчанию; решение отражается в каталоге команд.

### Context (SSoT links)
- [CLI spec](../../spec/cli/cli.md): принципы CLI. Читать как основную спецификацию.
- [Command catalog](../../spec/cli/command-catalog.md): команды `auth check`, `google login`. Читать, чтобы каждая команда имела одного исполнителя.
- [ADR-0004 — CLI на Commander](../../adr/ADR-0004-cli-commander.md): что даёт Commander и что реализуем сами. Читать перед написанием каркаса.
- [Architecture guardrails](../../spec/engineering/architecture-guardrails.md): CLI не импортирует `src/components` и `src/stores`. Читать, чтобы не сломать сборку CRA.

### Implementation plan
- Каркас: регистрация команд, общий форматтер вывода (human/JSON), единая обработка ошибок и кодов выхода — чтобы FT-0004, FT-0016, FT-0005 только добавляли команды.
- Коды ошибок — стабильные строки (например, `CREDENTIALS_MISSING`, `CREDENTIALS_INVALID`, `NETWORK_ERROR`); перечень — в CLI spec.
- `auth check` использует лёгкий запрос на чтение к каждому API; запись запрещена.
- Проверить совместимость с текущим ESM-запуском (`--loader ./loader.js`).

### Scenarios (acceptance)
#### Setup
- `.env` с действующими учётными данными одной системы и без учётных данных другой.
- Actors: разработчик / ИИ-агент.

#### Action
- `--help`; `auth check --json`; `auth check --system <нет данных> --json`.

#### Assert
- `--help` перечисляет команды с примерами.
- `auth check --json`: stdout — валидный JSON с результатом по каждой системе; код выхода ненулевой, если есть `missing`/`invalid`.
- Для системы без данных — `code = CREDENTIALS_MISSING` и имя переменной в `details`; секреты не выводятся.

### Tests
- Unit (FT-0006 есть к этому моменту или нет — по факту): форматтер вывода и маппинг ошибок в коды выхода.

### Definition of done
По [Feature template](../../mbb/templates/feature.md); дополнительно `npm run build`, `npm run web-build`, `npm run lint` зелёные.

### Docs updates (SSoT)
- [CLI spec](../../spec/cli/cli.md) — «Состояние», коды ошибок, способ запуска.
- [Command catalog](../../spec/cli/command-catalog.md) — `auth check`, `google login` из target в факт.
- [Stack & tooling](../../spec/project/stack-and-tooling.md) — npm-скрипт CLI вместо `npm start`.
