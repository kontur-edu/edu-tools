# FT-0004 — Запуск заданий из CLI
Status: Draft (2026-09-23)

## Feature FT-0004 — Запуск заданий из CLI
Epic: `EP-001`. Status: `Planned`.
Triage: `ready-for-agent`.
Blocked by: FT-0002, FT-0003, FT-0015.

### User value
Любое задание из каталога запускается одной командой — из Google Таблицы или из CSV-файла — и возвращает машиночитаемый результат. ИИ-агент может сам проверить, что задание работает, не открывая web.

### Deliverables
- `task run <sheetUrl | file.csv> [--save] [--json]`: источник определяется по аргументу; задание разбирается общим парсером (FT-0015) и выполняется тем же `CompositeTableTaskExecutor`, что и в web. По умолчанию try.
- `--json`: `task`, `mode` (`try` | `save`), `events[]` (FT-0002), `summary` (счётчики, `ok`). Код выхода ненулевой, если `ok = false`.
- Human output — тот же текст, что в web-логе.
- Учётные данные систем — из загрузчика FT-0001; нужны только системы, которые требует тип задания. Для CSV-источника Google не нужен.
- `task list [--json]` — типы заданий из реестра `CompositeTableTaskExecutor` (имя, нужные системы, пишет ли на лист).
- Задание, пишущее на лист, при CSV-источнике в этой фиче завершается ошибкой «не поддерживается, см. `--out`» — полноценное поведение в FT-0018.

### Context (SSoT links)
- [CLI spec](../../spec/cli/cli.md): принципы и схема результата. Читать как основную спецификацию.
- [Command catalog](../../spec/cli/command-catalog.md): `task run`, `task list`. Читать, чтобы команда вызывала одного исполнителя.
- [Table sources](../../spec/domain/table-sources.md): Google и CSV как источники. Читать, чтобы выбор источника был единственным отличием.
- [Task catalog](../../spec/domain/tasks/index.md): какие задания есть и какие системы им нужны. Читать для `task list`.
- [ADR-0003 — try/save](../../adr/ADR-0003-try-save-modes.md): try по умолчанию. Читать, чтобы `--save` оставался явным.

### Implementation plan
- Реестр типов заданий в `CompositeTableTaskExecutor` (имя → исполнитель, нужные API, пишет ли на лист) — вместо `switch`; из него строятся и маршрутизация, и `task list`. Поведение web не меняется.
- API-клиенты для CLI создаются лениво: запрошенный задание API без учётных данных → событие `error` с кодом `CREDENTIALS_MISSING`.
- `forceSave`: CLI передаёт `true` при `--save`, иначе `false`.

### Scenarios (acceptance)
#### Setup
- CSV-файл задания с неизвестным типом; CSV-файл задания `SendCuratorMarks` (или другого, для которого есть учётные данные) с тестовыми данными.
- Actors: ИИ-агент.

#### Action
- `task list --json`.
- `task run unknown.csv --json`.
- `task run <task.csv> --json` (try) и тот же лист по URL.

#### Assert
- `task list` содержит все задания из Task catalog.
- Неизвестный тип: одно событие `error`, `summary.ok = false`, ненулевой код выхода.
- Try: `mode = try`, во внешних системах нет изменений; результаты для CSV и Google на одинаковых данных совпадают (события и сводка).

### Tests
- Unit: реестр заданий; сборка результата `--json` из событий.
- Integration — в FT-0008 (EP-002).

### Definition of done
По [Feature template](../../mbb/templates/feature.md); дополнительно `npm run build`, `npm run web-build`, `npm run lint`, `npm test` зелёные.

### Docs updates (SSoT)
- [CLI spec](../../spec/cli/cli.md) — схема результата из черновика в факт.
- [Command catalog](../../spec/cli/command-catalog.md) — `task run`, `task list`.
- [Scenario registry](../scenarios.md) — первые сценарии через CLI.
- [Verification matrix](../verification-matrix.md) — базовая проверка «прогон try через CLI».
