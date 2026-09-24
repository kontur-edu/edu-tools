# FT-0015 — Разбор задания по сетке значений и CSV-источник
Status: Draft (2026-09-24)

## Feature FT-0015 — Разбор задания по сетке значений и CSV-источник
Epic: `EP-001`. Status: `Done`.
Triage: `ready-for-agent`.
Blocked by: FT-0006.

### User value
Задание можно прочитать из CSV-файла так же, как из Google Таблицы, без учётной записи Google. Разбор разметки перестаёт зависеть от источника, поэтому Google и CSV не разойдутся, а правила разбора тестируются на in-memory сетках. Для пользователей web поведение не меняется.

### Deliverables
- **CSV codec** — чистые функции `текст ⇄ string[][]` по правилам [Table sources](../../spec/domain/table-sources.md) (RFC 4180, `,`, BOM при чтении игнорируется, `\n` и `\r\n`).
- **Table task parser** — чистая функция `string[][] → TableTask`: вся разметка (`$`-колонки, `$keys`/`$values`, пространства имён, нормализация имён, ограничения вроде «параметры в первых 100 строках») вынесена из `TableTaskReader`.
- **Table source** (порт): прочитать сетку листа; записать блок значений с позиции. Реализации: Google (через `GoogleApi`, браузер и Node), CSV-файл (Node, вход только читается), in-memory.
- `TableTaskReader` / `TableTaskWriter` работают поверх порта; web использует Google-реализацию.
- `FileApi.readFromCsv` заменён CSV codec; вызывающие места (`readStudentsAsync`) переведены.
- Unit-тесты: codec, parser на in-memory сетках, эквивалентность Google- и CSV-источника на одной сетке.

### Context (SSoT links)
- [Table sources](../../spec/domain/table-sources.md): модули, формат CSV, инвариант равенства источников. Читать как основную спецификацию.
- [Table task format](../../spec/domain/table-task-format.md): разметка листа. Читать, чтобы парсер разбирал её полностью.
- [ADR-0005 — CSV как второй источник](../../adr/ADR-0005-csv-table-source.md): почему разбор отделён от источника. Читать, чтобы не вернуть логику в источник.
- [Architecture guardrails](../../spec/engineering/architecture-guardrails.md): п. 2 — CSV-файл (`fs`) только в Node-реализации. Читать, чтобы не сломать web-сборку.

### Implementation plan
- Сначала зафиксировать текущее поведение `TableTaskReader` тестами на in-memory сетке (характеризационные тесты), затем выносить разбор.
- Google-реализация порта читает сетку тем же набором диапазонов, что и сейчас, или весь лист — выбрать так, чтобы не увеличить число запросов к Google API заметно.
- CSV-реализация запись не выполняет сама: запись на лист при CSV-источнике — FT-0018.
- Codec и parser не импортируют `fs` и работают в браузере.

### Scenarios (acceptance)
#### Setup
- Лист задания в Google и его CSV-выгрузка (одна сетка значений).
- Actors: разработчик / тест.

#### Action
- Прочитать задание из Google-источника и из CSV-источника; прочитать из in-memory сетки.

#### Assert
- Три `TableTask` равны (параметры, строки, пространства имён).
- CSV со значениями, содержащими `,`, `"` и перевод строки, разбирается без потерь; BOM не попадает в первое значение.
- Задание в web запускается и ведёт себя как до изменения.

### Tests
- Unit: codec (кавычки, переводы строк, BOM, пустые ячейки); parser (все элементы разметки из Table task format); эквивалентность источников на in-memory сетке.

### Definition of done
По [Feature template](../../mbb/templates/feature.md); дополнительно `npm test`, `npm run build`, `npm run web-build`, `npm run lint` зелёные.

### Docs updates (SSoT)
- [Table sources](../../spec/domain/table-sources.md) — «Состояние» приводится к факту.
- [Layers & vertical slices](../../spec/project/layers-and-vertical-slices.md) — где живут codec, parser и источники.
