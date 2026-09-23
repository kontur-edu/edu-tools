# Implementation playbook (feature → code)
Status: Draft (2026-09-23)

Цель: единообразно превращать фичу (FT-*) в код в текущей структуре проекта, так чтобы логика заданий не утекала в UI, а документация оставалась синхронной.

Ссылки (аннотированные):
- [Repo structure](../spec/project/repo-structure.md): где что лежит. Читать, чтобы класть файлы в правильные папки.
- [Architecture guardrails](../spec/engineering/architecture-guardrails.md): обязательные правила зависимостей. Читать, чтобы не нарушить границы слоёв.
- [Coding style](../spec/engineering/coding-style.md): TypeScript, ESLint + Prettier, формат результатов. Читать, чтобы код был единообразным.
- [Documentation standards](../spec/engineering/documentation-standards.md): правила меморибанка. Читать, чтобы документация оставалась SSoT.

## 0) Собрать контекст
1. Открыть FT-документ: deliverables, сценарии, DoD.
2. Открыть связанные SSoT: [Table task format](../spec/domain/table-task-format.md), описание задания в [Task catalog](../spec/domain/tasks/index.md), нужную [интеграцию](../spec/integrations/index.md).

## 1) Рецепт: новое табличное задание
1. **Спецификация.** Описать задание в `spec/domain/tasks/<name>.md`: параметры, колонки, поведение, что считается расхождением. Добавить ссылку в индекс каталога.
2. **Адаптер.** Если не хватает операций внешней системы — добавить метод в `src/apis/<System>Api.ts`, типы — в `src/apis/types.ts` или рядом с клиентом.
3. **Исполнитель.** `src/tasks/<Name>Task.ts`: `static TASK_NAME`, конструктор `(api…, logger | null)`, `executeAsync(tableTask, forceSave)`; разбор параметров и строк — в функции `extractTask`; многошаговые переиспользуемые операции — в `src/actions/`.
4. **Try/Save.** Каждая запись во внешнюю систему — только под `save`. В режиме try лог показывает то же, что было бы сделано.
5. **Лог.** Статусы: 🟢 изменено, 🟡 без изменений/пропущено, 🔴 ошибка по элементу, 🟩/🟥 итог по группе, ✅ задание завершено.
6. **Регистрация.** Добавить ветку в `CompositeTableTaskExecutor` (и `ensure<System>Api`, если нужна новая система).
7. **Новая система** (если нужна): `*Auth`, `*UrlProvider` (через `CorsProxyUrlProvider`), стор в `src/stores/`, переключатель и диалог входа в `src/components/`, геттер в `App.tsx`.
8. **Проверка.** `npm run lint`, `npm run web-build`, ручной прогон try на тестовом листе; save — только после чистого try.

## 2) Изменение существующего задания
Сначала обновить `spec/domain/tasks/<name>.md`, затем код. Поведение, которое меняет формат листа, отражается и в [Table task format](../spec/domain/table-task-format.md), если оно общее.

## 3) После EP-001 / EP-002 / EP-003 (target)
- **CLI:** проверить задание через `task run <sheetUrl> --json` и добавить команду в [Command catalog](../spec/cli/command-catalog.md), если нужна отдельная.
- **Тесты:** unit на правила задания, CSV-фикстура задания и интеграционный сценарий через CLI (`task run <file.csv> --json`); строка в [Verification matrix](verification-matrix.md).
- **Слои:** правила — в core без I/O, внешние системы — через порты.

## 4) Memory bank updates
- FT-документ и эпик: статус и корректировки сценариев.
- `spec/*`: изменившиеся правила и интерфейсы.
- `adr/*`: новое существенное решение (по [ADR template](../mbb/templates/adr.md)).
