# FT-0016 — Конвертация Google ⇄ CSV
Status: Draft (2026-09-24)

## Feature FT-0016 — Конвертация Google ⇄ CSV
Epic: `EP-001`. Status: `Done`.
Triage: `ready-for-agent`.
Blocked by: FT-0003, FT-0015.

### User value
Реальный лист задания можно выгрузить в CSV (для фикстур и запуска без Google) и загрузить CSV обратно в Google Таблицу (например, результат `--out`). Значения при круговой конвертации не теряются.

### Deliverables
- `sheet export <sheetUrl> <file.csv> [--json]` — отображаемые значения всего листа в CSV (формулы и форматирование теряются).
- `sheet import <file.csv> <sheetUrl> [--overwrite] [--json]` — значения записываются как есть (`RAW`); непустой целевой лист без `--overwrite` — ошибка с кодом, без частичной записи.
- Converter — чтение сетки из одного источника и запись в другой через порт FT-0015.

### Context (SSoT links)
- [Table sources](../../spec/domain/table-sources.md): раздел «Конвертация». Читать как основную спецификацию.
- [Command catalog](../../spec/cli/command-catalog.md): `sheet export`, `sheet import`. Читать, чтобы флаги совпали.
- [CLI spec](../../spec/cli/cli.md): формат ошибок и `--json`. Читать, чтобы команды вели себя как остальные.

### Implementation plan
- Чтение отображаемых значений (`FORMATTED_VALUE`) и запись `RAW` — в Google-реализации порта; converter от Google API не зависит.
- `sheet import` без `--overwrite` сначала проверяет, пуст ли лист, и только потом пишет.
- При `--overwrite` лишние старые ячейки за пределами новой сетки очищаются, иначе круговая конвертация не сохранит значения.

### Scenarios (acceptance)
Ручная проверка пользователя (SC-0011): в окружении реализации нет токенов Google. Офлайн те же шаги на фейковом `GoogleApi` — SC-0009, SC-0010.

#### Setup
- Тестовая Google Таблица с листом задания, в котором есть значения `2024/2025`, `1, 2`, текст с переводом строки и кавычками.
- Actors: разработчик.

#### Action
- `sheet export <url> a.csv`; `sheet import a.csv <url пустого листа>`; `sheet export <тот лист> b.csv`; `sheet import a.csv <непустой лист>` без `--overwrite`.

#### Assert
- `a.csv` и `b.csv` совпадают побайтно.
- `2024/2025` и `1, 2` в Google остались строками.
- Импорт в непустой лист без `--overwrite` — ошибка, лист не изменён.

### Tests
- Unit: круговая конвертация на in-memory источниках; отказ при непустом целевом листе.
- Сделано: converter на in-memory источниках и фейковом `GoogleApi` — круговая конвертация, отказ без записи, очистка при `overwrite` (`src/tasks/TableConverter.test.ts`); команды `sheet export` / `sheet import` через `runProgramAsync` — SC-0009, SC-0010, ошибки аргументов и URL (`src/cli/commands/sheet.test.ts`); `task run` по URL на фейковом `GoogleApi` (`src/cli/commands/task.test.ts`).

### Implementation notes
- Converter — `convertTableAsync(from, to, { overwrite })` в `src/tasks/TableConverter.ts`: работает только через порт `TableSource`, порт не расширялся. Сетка источника пишется одним блоком с A1, строки выравниваются до одной ширины. Непустая цель без `overwrite` — `TableNotEmptyError` после чтения цели и до любой записи; CLI превращает её в новый код `SHEET_NOT_EMPTY` (`details.sheet`, `details.option = --overwrite`, код выхода 1).
- Очистка при `--overwrite`: блок покрывает и старую сетку, лишние ячейки записываются как `''` (запись `RAW` пустой строки очищает значение). Отдельный метод `clear` в порт и `values.clear` в `GoogleApi` не добавлялись: хватает существующей записи блока, а web-интерфейс `Spreadsheet` не меняется. Ограничение: ячейки с формулой, которая показывает пустую строку, за пределами последней непустой строки / колонки Google не возвращает — они не очищаются (значения листа при этом совпадают).
- `FORMATTED_VALUE` / `RAW`: чтение и раньше шло без `valueRenderOption`, то есть с `FORMATTED_VALUE` по умолчанию; теперь это значение указано явно в `NodeGoogleApi` и `BrowserGoogleApi` (поведение web и `task run` не меняется). Запись и раньше была `RAW` (`writeAsync` без `asEnteredByUser`), поведение записи результатов заданий не менялось.
- Выгрузка: сетка в памяти (`InMemoryTableSource`) → `writeCsvFile`; существующий файл перезаписывается, как `--out`. Google обрезает хвостовые пустые ячейки и строки, поэтому выгрузка — прямоугольная сетка, и повторная выгрузка после загрузки даёт тот же CSV побайтно (проверено на фейковом `GoogleApi`). Для произвольного CSV (строки разной длины, хвостовые пустые строки и ячейки) круг CSV → Google → CSV сохраняет значения, но не байты: хвосты обрезаются, строки выравниваются.
- «Без частичной записи» гарантируется для отказа при непустом листе: проверка идёт до записи. Сама запись неатомарна: `GoogleSheetTableSource.writeBlockAsync` пишет пакетами по 50 строк, и ошибка посреди загрузки (сеть, лимит сетки листа) оставит лист записанным частично. Повтор с `--overwrite` приводит лист к нужному виду.
- `sheet import` пишет в Google без `--save`: так команда задана в [Command catalog](../../spec/cli/command-catalog.md), сама команда — явная запись в указанный лист, от случайной порчи защищает проверка пустоты и `--overwrite`. Исключение записано в [ADR-0003](../../adr/ADR-0003-try-save-modes.md), guardrail 4 ([Architecture guardrails](../../spec/engineering/architecture-guardrails.md)) и принципах [CLI spec](../../spec/cli/cli.md) — по замечанию ревью Standards.
- Ошибки аргументов у `sheet` — тот же `TASK_SOURCE_INVALID` (`bad-url`, `sheet-not-found`, `not-found`), что у `task run`, без нового кода: разбор URL с `#gid=`, поиск листа и открытие CSV вынесены из `taskRun.ts` в `src/cli/sources.ts`. У `sheet import` URL и наличие файла проверяются до обращения к Google.
- Каркас CLI: в `CliContext` добавлен `googleApiAsync` (в `main.ts` — `NodeGoogleApi` с сохранёнными токенами), `task run` тоже берёт Google через него. Это позволило тестировать Google-путь команд на фейке. Общие хелперы тестов — `src/testing/` (stateful `fakeGoogleApi`, `runCliAsync`), в сборку `tsc` не входят.
- Живой прогон против Google не выполнялся (нет токенов): SC-0011 — ручная проверка пользователя. Не проверено вживую: запись за пределами текущего размера сетки листа (Sheets API может отказать `exceeds grid limits` для листа меньше CSV) — если так, лист нужно расширить вручную или доработать импорт.

### Definition of done
По [Feature template](../../mbb/templates/feature.md); дополнительно `npm run build`, `npm run lint`, `npm test` зелёные.

### Docs updates (SSoT)
- [Table sources](../../spec/domain/table-sources.md) — «Состояние».
- [Command catalog](../../spec/cli/command-catalog.md) — `sheet export`, `sheet import`.
- [CLI spec](../../spec/cli/cli.md) — команды конвертации, `SHEET_NOT_EMPTY`, `TASK_SOURCE_INVALID` для `sheet`, `googleApiAsync` в `CliContext`, исключение `sheet import` из правила `--save`.
- [Repo structure](../../spec/project/repo-structure.md) — `src/testing/`.
- [ADR-0003](../../adr/ADR-0003-try-save-modes.md) и [Architecture guardrails](../../spec/engineering/architecture-guardrails.md) — `sheet import` вне правила try/save.
- [Scenario registry](../scenarios.md) — SC-0009…SC-0011; [Verification matrix](../verification-matrix.md) — строка FT-0016.
