# CLI command catalog (1:1 → executor)
Status: Draft (2026-09-23)

Цель: у каждой команды CLI ровно один исполнитель (задание или action), чтобы сценарии приёмки автоматизировались через CLI и повторяли поведение web.

Все команды — **target** (реализуются в EP-001), имена могут уточниться.

| Команда | Исполнитель | Нужные учётные данные | Пишет во внешние системы |
|---|---|---|---|
| `task run <sheetUrl \| file.csv> [--save] [--out <file.csv>]` | `CompositeTableTaskExecutor` (тип задания берётся из листа) | Google (только для URL) + системы задания | только с `--save`; входной CSV не изменяется никогда, запись на лист при CSV-источнике идёт в `--out` |
| `sheet export <sheetUrl> <file.csv>` | converter Google → CSV | Google | нет (пишет локальный файл) |
| `sheet import <file.csv> <sheetUrl> [--overwrite]` | converter CSV → Google | Google | да (в Google Таблицу) |
| `task list` | реестр типов заданий | — | нет |
| `auth check [--system <name>]` | пробный запрос стора/адаптера системы | проверяемая система | нет |
| `google login` | `NodeGoogleAuth` (installed-app flow) | `secrets/google.json` | нет |

Отдельной команды для переноса баллов в БРС нет: это табличное задание `PutMarksToBrs`, которое запускается через `task run` ([FT-0005](../../plans/features/FT-0005-put-marks-to-brs-task.md)).

Скрипт Partner → Notion (`cloneProjects`) в CLI не переносится: он не развивается и может быть удалён или переписан с заменой Notion на BuildIn.AI.

Формат записи при добавлении команды: команда, исполнитель, учётные данные, пишет ли в системы.
