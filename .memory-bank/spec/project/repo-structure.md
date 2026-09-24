# Repo structure
Status: Draft (2026-09-24)

Цель: описать фактическую структуру репозитория и границы частей, чтобы новый код попадал в правильное место, а логика заданий не утекала в UI.

Репозиторий — **не монорепо**: один `package.json` в корне для web + бота + Node-скриптов, плюс два независимых подпроекта со своими `package.json`. Переход к более строгим слоям — в [EP-003](../../plans/epics/EP-003-layers.md).

## Документация и правила (корень)
- `AGENTS.md` — правила для ИИ-агентов и краткий системный контекст (C4 L1). Читать перед крупными изменениями.
- `CLAUDE.md` — подключает `AGENTS.md` импортом (`@AGENTS.md`), чтобы Claude Code загружал его автоматически.
- `.memory-bank/` — SSoT документации проекта (spec/adr/plans + MBB). Обновлять при изменении требований, решений или планов.
- `README.md` — точка входа для людей: что это за проект, как запустить, где документация.

## Код (корень, общий `src/`)
- `src/index.tsx` — точка входа web SPA.
- `src/bot.ts`, `src/bot-start.ts`, `src/bot-register.ts` — Telegram bot (облачный handler, локальный запуск, регистрация webhook).
- `src/cli/` — CLI на Commander: точка входа, каркас вывода и ошибок, команды ([CLI spec](../cli/cli.md)). Не импортирует `src/components` и `src/stores`.
- `src/legacyScripts.ts` — разовые Node-скрипты с параметрами в коде (бывший `src/main.ts`); CLI их не вызывает, запуск заданий переходит в `task run` ([EP-001](../../plans/epics/EP-001-cli-and-observability.md)).
- `src/putMarks.sample.ts` — пример запуска переноса баллов в БРС из Node.
- `src/components/` — React UI (только web).
- `src/stores/` — Zustand-сторы авторизаций во внешних системах (только web).
- `src/tasks/` — движок табличных заданий и исполнители заданий (общий для web и Node).
- `src/actions/` — многошаговые операции над внешними системами, переиспользуемые заданиями и скриптами.
- `src/apis/` — клиенты внешних систем (`*Api`, `*Auth`, `*UrlProvider`), абстракция `GoogleApi` с браузерной и Node-реализациями, общие типы.
- `src/helpers/` — утилиты (кэши browser/file, нормализация строк, даты, CORS-proxy URL).
- `public/` — статика CRA.
- `loader.js`, `nodemon.json`, `tsconfig.json`, `.eslintrc`, `.prettierrc` — сборка/запуск/стиль.
- `vitest.config.ts`, `tsconfig.test.json` — unit-тесты и проверка их типов. Сами тесты лежат рядом с модулями: `src/**/<module>.test.ts` ([ADR-0007](../../adr/ADR-0007-vitest-test-runner.md)).
- `web-deploy.sh`, `bot-deploy.sh` — деплой.
- `scripts/` — служебные скрипты разработки (`check-memory-bank.mjs` для `npm run docs:check`).

## Подпроекты
- `cors-proxy/` — форк `cors-anywhere` + `Dockerfile` + `deploy.sh`. Независимый `package.json`.
- `brs-extensions/` — **референс для переноса, не развивается.** Отдельное CRA-приложение (React 17, MUI v4) по схожей тематике: перенос баллов из Google Таблиц в БРС, деплой на GitHub Pages. Его функциональность нужно полностью перенести в edu-tools. Код не дописываем и не рефакторим: он служит примером, с которого проще переносить.

## Границы
Правила зависимостей между папками — в [Architecture guardrails](../engineering/architecture-guardrails.md). Читать перед тем, как добавлять импорты между `components`, `stores`, `tasks`, `actions` и `apis`.

Ссылки (аннотированные):
- [C4 L3 — Components](../c4/l3-components.md): компоненты и направление зависимостей. Читать, чтобы класть новый код в правильный слой.
- [Layers & vertical slices](layers-and-vertical-slices.md): слои сейчас и целевые. Читать, чтобы понимать, куда движется структура.
