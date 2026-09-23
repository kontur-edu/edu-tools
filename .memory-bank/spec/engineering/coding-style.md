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
- Исполнители сообщают о результатах и ошибках событиями через `TaskReporter` ([Execution events](../domain/tasks/execution-events.md)); текстовый лог со статусами-эмодзи строится из событий. Строки лога напрямую не пишутся.
- «Unknown task» и «API is not available» — события `error`; неожиданные исключения `CompositeTableTaskExecutor` пробрасывает.
- Цель ([EP-001](../../plans/epics/EP-001-cli-and-observability.md)): ошибки CLI `code + message + details` и `--json`, построенный из тех же событий.

## CLI conventions
Соглашения по выводу CLI — в [CLI spec](../cli/cli.md).
