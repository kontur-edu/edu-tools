# FT-0021 — Сценарий ExportTechnologyCards с эталонным `--out`
Status: Draft (2026-09-24)

## Feature FT-0021 — Сценарий ExportTechnologyCards с эталонным `--out`
Epic: `EP-002`. Status: `Planned`.
Triage: `ready-for-human`.
Blocked by: FT-0008, FT-0018.

### User value
Задание, которое пишет результат на лист, проверяется целиком: не только события, но и то, что именно оказалось бы на листе. Изменение раскладки выгрузки техкарт сразу видно как diff с эталонным CSV.

### Deliverables
- Обезличенная CSV-фикстура `ExportTechnologyCards` и эталонный CSV результата.
- Живой сценарий в try на каркасе FT-0008: `task run <fixture.csv> --out <tmp.csv> --json`; проверки `summary` и сравнение `--out` с эталоном (при расхождении — понятный diff по ячейкам).
- Офлайн-проверка в `npm test`: без `--out` задание выдаёт `warning` с подсказкой (если это достижимо без сети; иначе — часть живого сценария).
- Запись `SC-XXXX` в [Scenario registry](../scenarios.md).

### Context (SSoT links)
- [Export technology cards](../../spec/domain/tasks/export-technology-cards.md): какие блоки и куда пишутся. Читать, чтобы составить эталон.
- [FT-0018](FT-0018-csv-sheet-write-out.md): поведение `--out`. Читать, чтобы сценарий проверял его контракт.
- [Table sources](../../spec/domain/table-sources.md): раздел «Запись результатов заданий». Читать, чтобы сравнение учитывало формат CSV.
- [FT-0008](FT-0008-cli-integration-harness.md): каркас. Читать, чтобы сценарий был однотипен остальным.

### Implementation plan
- `ready-for-human`: фикстура и эталон строятся из реальной выгрузки БРС с обезличиванием; прогон требует действующего `sid` БРС.
- Для стабильности эталона выбрать архивный учебный год/семестр, где список техкарт уже не меняется.
- Входной CSV после прогона не изменён — проверяется в сценарии.

### Scenarios (acceptance)
#### Setup
- CSV-фикстура `ExportTechnologyCards`, эталонный CSV; действующий `sid` БРС.
- Actors: разработчик.

#### Action
- `npm run test:integration`.

#### Assert
- `--out` совпадает с эталоном; входной файл не изменён; `summary.ok = true`.
- При искусственно испорченном эталоне сценарий падает с diff по ячейкам.

### Tests
- Integration: сценарий из Deliverables.

### Definition of done
По [Feature template](../../mbb/templates/feature.md); дополнительно сценарий пройден с действующими учётными данными.

### Docs updates (SSoT)
- [Scenario registry](../scenarios.md) — новый сценарий с эталоном.
