# Scenario registry
Status: Draft (2026-09-24)

Цель: связать план с проверяемыми сценариями и их фикстурами. Формат одного сценария — в [Feature template](../mbb/templates/feature.md) (Setup → Action → Assert); здесь только реестр.

**Состояние:** сценарии двух уровней. SC-0001…SC-0010 выполняются в `npm test` через публичный вход CLI в том же процессе (`runProgramAsync`), CSV-фикстуры создаются в самом тесте. С FT-0008 появился каркас, который запускает собранный CLI отдельным процессом (`src/testing/cliProcess.ts`):
- **офлайн** (`src/**/*.scenario.test.ts`) — без учётных данных и сети, входят в `npm test`;
- **живые** (`src/**/*.live.test.ts`) — только try (`--save` запрещён каркасом), к реальным системам УрФУ, запускаются `npm run test:integration`. Если учётных данных системы нет, сценарий пропускается, а в выводе стоят имена недостающих переменных.

Фикстуры каркаса лежат в `src/cli/scenarios/fixtures/` и называются `<SC-XXXX>-<slug>.csv`. Они обезличены: ФИО вымышленные, проекты и дисциплины несуществующие или тестовые. Фикстуры — CSV-файлы ([Table sources](../spec/domain/table-sources.md)), поэтому учётная запись Google для сценариев не нужна.

Формат записи:
- `SC-XXXX` — название;
- фича (`FT-XXXX`);
- фикстура (CSV-файл задания в репозитории; для заданий, пишущих на лист, — эталонный CSV для сравнения с `--out`);
- команда (`task run … --json`);
- ключевые проверки (`summary`, статусы событий).

## Сценарии
- `SC-0001` — неизвестный тип задания; FT-0004; CSV с `task = Unknown` (в `src/cli/commands/task.test.ts`); `task run <file.csv> --json`; одно событие `error` со `stopped`, `summary.ok = false`, код выхода 1.
- `SC-0002` — нет учётных данных системы задания; FT-0004; CSV с `task = SendCuratorMarks`, пустое окружение (в `src/cli/commands/task.test.ts`); `task run <file.csv> --save --json`; `mode = save`, одно событие `error` с `details.code = CREDENTIALS_MISSING`, `details.system = teamproject`.
- `SC-0003` — список заданий; FT-0004; без фикстуры; `task list --json`; все задания из [Task catalog](../spec/domain/tasks/index.md) с системами и признаком записи на лист.
- `SC-0004` — прогон try `SendCuratorMarks` из CSV и того же листа по URL; FT-0004 (ручной); CSV-часть автоматизирована в SC-0014 (FT-0008), по URL — вручную; тестовый лист и его выгрузка в CSV, действующий `TEAMPROJECT_JWT`; `task run <file.csv> --json` и `task run <sheetUrl> --json`; `mode = try`, во внешних системах нет изменений, `events` и `summary` совпадают.
- `SC-0005` — выходной файл `--out` в try; FT-0018; CSV с `task = Unknown` (в `src/cli/commands/task.test.ts`); `task run <file.csv> --out <result.csv> --json`; `result.out` = путь, выходной файл = входная сетка, входной файл не изменён.
- `SC-0006` — `--out` на месте входного файла; FT-0018; CSV в том же тесте; `task run <file.csv> --out <тот же путь> --json`; код выхода 2, `USAGE_ERROR`, `details.reason = same-as-source`, входной файл не изменён.
- `SC-0007` — `--out` с URL Google Таблицы; FT-0018; без фикстуры; `task run <sheetUrl> --out <file.csv> --json`; код выхода 2, `USAGE_ERROR`, `details.reason = google-source`, без обращения к Google.
- `SC-0008` — прогон try `PutMarksToBrs`; FT-0005, **отложен до FT-0008** (каркас интеграционных тестов, EP-002); CSV тестовой дисциплины: параметры, 2–3 студента, `$$домашняя работа` ×2 и `$$экзамен`, действующий `BRS_SID`, плюс CSV без `semester`; `task run marks.csv --json`, `task run no-semester.csv --json`; в `events` отчёт (группа, сопоставление студентов, баллы), две «домашние работы» сопоставлены по порядку, в БРС нет изменений, `summary.ok = true`; без `semester` — `- semester required❗`, `summary.ok = false`. Пока офлайн покрыт unit-тестами на фейковом `BrsApi` (`src/tasks/PutMarksToBrsTask.test.ts`, `src/tasks/CompositeTableTaskExecutor.test.ts`).
- `SC-0009` — круговая конвертация на фейковом Google; FT-0016; лист со значениями `2024/2025`, `1, 2`, кавычками и переводом строки в фейковом `GoogleApi` (в `src/cli/commands/sheet.test.ts`); `sheet export <url> a.csv --json`, `sheet import a.csv <url пустого листа> --json`, `sheet export <тот лист> b.csv --json`; код выхода 0, `result.rows` / `result.columns`, `a.csv` и `b.csv` совпадают побайтно.
- `SC-0010` — импорт в непустой лист без `--overwrite`; FT-0016; CSV и непустой лист фейкового `GoogleApi` (в `src/cli/commands/sheet.test.ts`); `sheet import a.csv <url> --json`; код выхода 1, `SHEET_NOT_EMPTY`, `details.option = --overwrite`, записей в лист нет; с `--overwrite` лист заменён, лишние старые ячейки очищены.
- `SC-0011` — круговая конвертация с живой Google Таблицей; FT-0016 (ручной, пользователь; автоматизация — EP-002); тестовая таблица с листом задания (`2024/2025`, `1, 2`, текст с переводом строки и кавычками), пустой и непустой лист, сохранённые токены (`google login`); шаги SC-0009 и SC-0010 по живым URL; `a.csv` = `b.csv` побайтно, `2024/2025` и `1, 2` в Google — строки (не дата и не число), непустой лист без `--overwrite` не изменён.
- `SC-0012` — список заданий процессом CLI; FT-0008, офлайн; без фикстуры (в `src/cli/scenarios/cli.scenario.test.ts`); `task list --json`; код выхода 0, `ok = true`, в `result.tasks` есть `SendCuratorMarks` (`teamproject`) и `ExportTechnologyCards` (`brs`, пишет на лист).
- `SC-0013` — неизвестный тип задания процессом CLI; FT-0008, офлайн; `SC-0013-unknown-task.csv`; `task run <file.csv> --json`; одно событие `error` со `stopped`, `summary.ok = false`, `counts.error = 1`, код выхода 1.
- `SC-0014` — живой try `SendCuratorMarks` из CSV; FT-0008, живой (`TEAMPROJECT_JWT`); `SC-0014-send-curator-marks.csv` — две строки с несуществующим проектом и одна строка без проекта (в `src/cli/scenarios/sendCuratorMarks.live.test.ts`); `task run <file.csv> --json`; `mode = try`, событий со `stopped` нет, т. е. авторизация и чтение рабочих пространств прошли; `error` «not found in any project» по двум строкам с проектом, `skipped` по строке без проекта, вердикт `failed` по заданию, `changed = 0`, код выхода 1. Без учётных данных — пропуск с `TEAMPROJECT_JWT или TEAMPROJECT_JWT_FILE`, код выхода 0; с недействительными — падение.
- `SC-0015` — живой try `SendCuratorMarks` по тестовому проекту; FT-0008, живой (`TEAMPROJECT_JWT`); локальный CSV тестового проекта TeamProject (реальные ФИО, в репозиторий не коммитится), путь в `SC_0015_SEND_CURATOR_MARKS_CSV` (`.env`); `task run <file.csv> --json` дважды; `mode = try`, событий со `stopped` нет, хотя бы один проект обработан (`heading` уровня 2), итерация и оценки прочитаны, outcome-события двух прогонов совпадают: try не записал оценки, иначе `changed` во втором прогоне сменился бы на `unchanged`. Без переменной или учётных данных — пропуск с причиной.
