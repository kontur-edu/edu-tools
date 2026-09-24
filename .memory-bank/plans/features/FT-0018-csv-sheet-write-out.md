# FT-0018 — Запись на лист при CSV-источнике (`--out`)
Status: Draft (2026-09-24)

## Feature FT-0018 — Запись на лист при CSV-источнике (`--out`)
Epic: `EP-001`. Status: `Done`.
Triage: `ready-for-agent`.
Blocked by: FT-0004.

### User value
Задания, которые пишут результат на лист (сейчас — `ExportTechnologyCards`), можно запускать из CSV: результат сохраняется в отдельный CSV-файл, который можно сравнить с эталоном в тесте или импортировать в Google Таблицу. Входной файл никогда не портится.

### Deliverables
- `task run <file.csv> --out <result.csv>`: запись на лист идёт в выходной файл, в котором лежит весь лист — входная сетка плюс записанные блоки. Файл пишется и в try, и в save.
- Без `--out`: запись не выполняется, событие `warning` с подсказкой указать `--out`; значения, которые были бы записаны, — в `details`.
- `--out` с Google-источником — ошибка использования `USAGE_ERROR`, код выхода 2 (зафиксировано в CLI spec).
- Входной CSV не изменяется ни при каких флагах, включая `--out`, совпадающий с входным путём (ошибка).

### Context (SSoT links)
- [Table sources](../../spec/domain/table-sources.md): раздел «Запись результатов заданий». Читать как основную спецификацию.
- [Export technology cards](../../spec/domain/tasks/export-technology-cards.md): задание, которое пишет на лист. Читать, чтобы знать, какие блоки и куда пишутся.
- [CLI spec](../../spec/cli/cli.md): статус `warning`. Читать, чтобы событие совпало со схемой.

### Implementation plan
- CSV-реализация порта источника (FT-0015) получает режим записи в сетку в памяти; по окончании задания сетка сериализуется codec'ом в `--out`. `writeBlockAsync` у `InMemoryTableSource` и `CsvFileTableSource` после FT-0015 бросает ошибку — запись в сетку в памяти с расширением размеров реализуется здесь.
- Без `--out` — реализация порта, которая не пишет, а выдаёт событие `warning` с данными блока.

### Scenarios (acceptance)
#### Setup
- CSV-файл задания `ExportTechnologyCards` с тестовыми данными; действующий `sid` БРС.
- Actors: ИИ-агент.

#### Action
`ExportTechnologyCards` пишет на лист только в save, поэтому оба запуска — с `--save` (в БРС задание только читает).
- `task run export.csv --save --json` (без `--out`).
- `task run export.csv --save --out result.csv --json`.

#### Assert
- Без `--out`: событие `warning`, в `details` записываемые значения; файлов не создано; входной файл не изменён.
- С `--out`: `result.csv` = входная сетка + блоки на ожидаемых позициях; входной файл не изменён (сравнить хэш до/после).

### Tests
- Unit: запись блоков в in-memory сетку с расширением размеров; сериализация в CSV.

### Implementation notes
- Запись в сетку в памяти — чистая функция `writeBlockToGrid(grid, left, top, values)` в `src/tasks/TableSource.ts` (без fs, пригодна для web и для FT-0016). Её используют `InMemoryTableSource` и `CsvFileTableSource`. Результат прямоугольный. Значения приводятся так, как их показывает Google при записи `RAW`: `TRUE` / `FALSE`, числа строкой, `null` не меняет ячейку.
- `CsvFileTableSource` читает файл один раз и дальше работает с сеткой в памяти: запись её меняет, чтение возвращает сетку после записи (как у Google-листа). В файл источник не пишет никогда. CLI сохраняет сетку в `--out` функцией `writeCsvFile` (`src/apis/NodeCsvFile.ts`).
- Без `--out` CLI оборачивает CSV-источник в `WriteSkippingTableSource`. Это реализация порта, которая вместо записи выдаёт `warning`. `scope` и `details.range` — диапазон блока в A1-нотации: задания у источника нет, а диапазон точно называет, что не записано. `details.values` — блок CSV-текстом: `details` плоские, а CSV читается человеком и сразу сохраняется в файл. JSON был бы вторым форматом для той же сетки.
- `--out` с URL Google Таблицы — `USAGE_ERROR` (код 2), а не игнор с `warning`: флаг без эффекта скрыл бы ошибку вызова. Проверки `--out` выполняются до чтения источника.
- `--out`, совпадающий с входным файлом, — `USAGE_ERROR`. Сравниваются пути после `path.resolve`, а если оба файла есть — `dev` + `ino` из `fs.stat`. Это ловит символические и жёсткие ссылки и регистронезависимые файловые системы; сравнение строк в нижнем регистре не использовано, так как на macOS оно не надёжно.
- Выходной файл пишется и тогда, когда задание завершилось ошибкой: лист Google тоже сохраняет уже записанные блоки. Ошибка записи файла — событие `error` с `details.out`, а не ошибка команды, чтобы не терять события. В `result` добавлено поле `out` (только с `--out`).
- `TaskExecutionError` больше не бросается источниками. Ошибка «запись на лист при CSV-источнике не поддерживается» из FT-0004 удалена.
- `ExportTechnologyCards` пишет только в save. Поэтому сценарий приёмки идёт с `--save`, а в try выходной файл совпадает со входом. У [FT-0021](FT-0021-export-technology-cards-scenario.md) живой сценарий описан в try, и при реализации ему тоже понадобится `--save`.
- Офлайн проверены: `ExportTechnologyCards` с фейковым `BrsApi` (`src/tasks/ExportTechnologyCardsTask.test.ts`) и `task run --out` через `runProgramAsync` (SC-0005…SC-0007). Живой прогон с БРС не выполнялся: в окружении реализации нет действующего `BRS_SID`.

### Definition of done
По [Feature template](../../mbb/templates/feature.md); дополнительно `npm run build`, `npm run lint`, `npm test` зелёные.

### Docs updates (SSoT)
- [Table sources](../../spec/domain/table-sources.md) — «Состояние».
- [Command catalog](../../spec/cli/command-catalog.md) — `--out` в `task run`.
- [CLI spec](../../spec/cli/cli.md) — `--out`, `result.out`, `warning`, `USAGE_ERROR` для `--out`.
- [Execution events](../../spec/domain/tasks/execution-events.md) — `scope` блока записи на лист.
- [Scenario registry](../scenarios.md) — SC-0005…SC-0007; [Verification matrix](../verification-matrix.md) — строка FT-0018.
