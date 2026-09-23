# Verification matrix (FT → checks)
Status: Draft (2026-09-23)

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
