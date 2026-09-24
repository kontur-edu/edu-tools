# Scenario registry
Status: Draft (2026-09-24)

Цель: связать план с проверяемыми сценариями и их фикстурами. Формат одного сценария — в [Feature template](../mbb/templates/feature.md) (Setup → Action → Assert); здесь только реестр.

**Состояние:** первые сценарии через CLI (FT-0004) офлайн: они не обращаются к внешним системам и выполняются в `npm test` через публичный вход CLI (`runProgramAsync`), CSV-фикстуры создаются в самом тесте. Каркас с запуском CLI процессом, фикстуры в репозитории и живые сценарии — EP-002 (FT-0008). Фикстуры — CSV-файлы ([Table sources](../spec/domain/table-sources.md)), поэтому для сценариев не нужна учётная запись Google.

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
- `SC-0004` — прогон try `SendCuratorMarks` из CSV и того же листа по URL; FT-0004 (ручной), автоматизация — FT-0008; тестовый лист и его выгрузка в CSV, действующий `TEAMPROJECT_JWT`; `task run <file.csv> --json` и `task run <sheetUrl> --json`; `mode = try`, во внешних системах нет изменений, `events` и `summary` совпадают.
- `SC-0005` — выходной файл `--out` в try; FT-0018; CSV с `task = Unknown` (в `src/cli/commands/task.test.ts`); `task run <file.csv> --out <result.csv> --json`; `result.out` = путь, выходной файл = входная сетка, входной файл не изменён.
- `SC-0006` — `--out` на месте входного файла; FT-0018; CSV в том же тесте; `task run <file.csv> --out <тот же путь> --json`; код выхода 2, `USAGE_ERROR`, `details.reason = same-as-source`, входной файл не изменён.
- `SC-0007` — `--out` с URL Google Таблицы; FT-0018; без фикстуры; `task run <sheetUrl> --out <file.csv> --json`; код выхода 2, `USAGE_ERROR`, `details.reason = google-source`, без обращения к Google.
