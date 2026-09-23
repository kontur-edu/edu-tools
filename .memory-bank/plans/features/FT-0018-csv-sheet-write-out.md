# FT-0018 — Запись на лист при CSV-источнике (`--out`)
Status: Draft (2026-09-23)

## Feature FT-0018 — Запись на лист при CSV-источнике (`--out`)
Epic: `EP-001`. Status: `Planned`.
Triage: `ready-for-agent`.
Blocked by: FT-0004.

### User value
Задания, которые пишут результат на лист (сейчас — `ExportTechnologyCards`), можно запускать из CSV: результат сохраняется в отдельный CSV-файл, который можно сравнить с эталоном в тесте или импортировать в Google Таблицу. Входной файл никогда не портится.

### Deliverables
- `task run <file.csv> --out <result.csv>`: запись на лист идёт в выходной файл, в котором лежит весь лист — входная сетка плюс записанные блоки. Файл пишется и в try, и в save.
- Без `--out`: запись не выполняется, событие `warning` с подсказкой указать `--out`; значения, которые были бы записаны, — в `details`.
- `--out` с Google-источником — ошибка использования (или игнор с `warning`; выбрать и зафиксировать в CLI spec).
- Входной CSV не изменяется ни при каких флагах, включая `--out`, совпадающий с входным путём (ошибка).

### Context (SSoT links)
- [Table sources](../../spec/domain/table-sources.md): раздел «Запись результатов заданий». Читать как основную спецификацию.
- [Export technology cards](../../spec/domain/tasks/export-technology-cards.md): задание, которое пишет на лист. Читать, чтобы знать, какие блоки и куда пишутся.
- [CLI spec](../../spec/cli/cli.md): статус `warning`. Читать, чтобы событие совпало со схемой.

### Implementation plan
- CSV-реализация порта источника (FT-0015) получает режим записи в сетку в памяти; по окончании задания сетка сериализуется codec'ом в `--out`.
- Без `--out` — реализация порта, которая не пишет, а выдаёт событие `warning` с данными блока.

### Scenarios (acceptance)
#### Setup
- CSV-файл задания `ExportTechnologyCards` с тестовыми данными; действующий `sid` БРС.
- Actors: ИИ-агент.

#### Action
- `task run export.csv --json` (без `--out`).
- `task run export.csv --out result.csv --json`.

#### Assert
- Без `--out`: событие `warning`, в `details` записываемые значения; файлов не создано; входной файл не изменён.
- С `--out`: `result.csv` = входная сетка + блоки на ожидаемых позициях; входной файл не изменён (сравнить хэш до/после).

### Tests
- Unit: запись блоков в in-memory сетку с расширением размеров; сериализация в CSV.

### Definition of done
По [Feature template](../../mbb/templates/feature.md); дополнительно `npm run build`, `npm run lint`, `npm test` зелёные.

### Docs updates (SSoT)
- [Table sources](../../spec/domain/table-sources.md) — «Состояние».
- [Command catalog](../../spec/cli/command-catalog.md) — `--out` в `task run`.
