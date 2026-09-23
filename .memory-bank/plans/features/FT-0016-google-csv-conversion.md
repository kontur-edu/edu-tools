# FT-0016 — Конвертация Google ⇄ CSV
Status: Draft (2026-09-23)

## Feature FT-0016 — Конвертация Google ⇄ CSV
Epic: `EP-001`. Status: `Planned`.
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

### Definition of done
По [Feature template](../../mbb/templates/feature.md); дополнительно `npm run build`, `npm run lint`, `npm test` зелёные.

### Docs updates (SSoT)
- [Table sources](../../spec/domain/table-sources.md) — «Состояние».
- [Command catalog](../../spec/cli/command-catalog.md) — `sheet export`, `sheet import`.
