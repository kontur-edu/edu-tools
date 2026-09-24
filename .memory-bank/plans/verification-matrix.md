# Verification matrix (FT → checks)
Status: Draft (2026-09-24)

Цель: SSoT «что именно надо запустить», чтобы считать фичу реализованной, и чтобы ИИ-агент мог сам проверить готовность.

Ссылки (аннотированные):
- [Epics index](epics/index.md): эпики и их фичи. Читать, чтобы перейти от FT к деталям реализации.
- [Scenario registry](scenarios.md): сценарии приёмки. Читать, чтобы знать, какие сценарии обязаны быть зелёными.

## Базовые проверки (для любой фичи, сейчас)
- `npm run lint`
- `npm run docs:check` (если затронут `.memory-bank/`, `AGENTS.md` или `CLAUDE.md`)
- `npm run web-build` (если затронут web) и `npm run build` (если затронут Node-код)
- ручной прогон try на тестовом листе для затронутых заданий (после FT-0015 — можно на CSV через CLI)

После EP-002 к базовым добавляется `npm test`.

## Matrix
Формат строки: `FT` | `Must add test` (какой тест добавляем, путь) | `Must run` (какие сценарии и проверки обязаны быть зелёными).

| FT | Must add test | Must run |
|---|---|---|
| FT-0001 | Unit-тесты `NodeCredentials` после FT-0006: значение из переменной / нет значения / значение из файла / `secrets/brs.json` с `BRS_USER` (`src/apis/NodeCredentials.ts`) | `npm run build`, `npm run lint`; вызов `brsAuth()` без `BRS_SID` даёт `CredentialsError` с именами переменных, `itsAuth()` при заданном `ITS_AUTH` создаёт клиент; поиск по `src/` не находит `sid`, токенов и кук |
| FT-0002 | Unit-тесты после FT-0006: текстовый рендер набора событий (`src/tasks/TaskEventText.ts`), сводка по статусам (`src/tasks/TaskEvents.ts`) | `npm run build`, `npm run web-build`, `npm run lint`; прогон каждого задания в try: текст лога совпадает с логом до изменений, кроме отличий из [Execution events](../spec/domain/tasks/execution-events.md); неизвестный тип задания даёт одно событие `error` и `ok = false` |
| FT-0003 | Unit-тесты после FT-0006: `renderJson` / `renderHumanError` / `exitCodeFor` (`src/cli/output.ts`), `toCliError` (`src/cli/errors.ts`), `checkSystemsAsync` на фейковых пробах (`src/cli/commands/authCheck.ts`) | `npm run build`, `npm run web-build`, `npm run lint`; `npm run -s cli -- --help` (код 0, команды и примеры); без учётных данных ИТС `auth check --system its --json` → код 1, `status = missing`, `code = CREDENTIALS_MISSING`, `ITS_AUTH` в `details.variables`; `auth check --json` → stdout — валидный JSON по пяти системам, значение `BRS_SID` не выводится; `auth check --system nope --json` → код 2, `USAGE_ERROR`; с действующими данными системы — `ok` |
