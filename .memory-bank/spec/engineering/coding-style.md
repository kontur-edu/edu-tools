# Coding style (project-wide)
Status: Draft (2026-09-23)

## Principles
- Без оверинжиниринга: делаем самым простым способом, но с требуемыми функциями.
- Границы слоёв — в [Architecture guardrails](architecture-guardrails.md).

## TypeScript
- Строгая типизация (`strict`): избегаем `any` и «размытых» DTO. В существующем коде `any` встречается — при изменении кода заменяем на типы.
- Асинхронные функции и методы имеют суффикс `Async`.
- Относительные импорты пишутся как с `.js`, так и без: в Node недостающее расширение дописывает `loader.js`.

## Formatting & lint
- Связка ESLint + Prettier (другие линтеры/форматтеры не вводим).
- Prettier: без `;`, одинарные кавычки, trailing commas, ширина 120, отступ 2.
- ESLint `@typescript-eslint/recommended` на `src/`, должен запускаться pre-commit хуком (Husky); сейчас хук не работает — FT-0017.

## Errors & results
- Сейчас: исполнители сообщают о результатах и ошибках строками лога со статусами-эмодзи (🟢 🟡 🔴 🟩 🟥 ❌); неожиданные исключения ловит `CompositeTableTaskExecutor`.
- Цель ([EP-001](../../plans/epics/EP-001-cli-and-observability.md)): структурированные события результата и ошибки `code + message + details`, из которых строится и текстовый лог, и `--json`.

## CLI conventions
Соглашения по выводу CLI — в [CLI spec](../cli/cli.md).
