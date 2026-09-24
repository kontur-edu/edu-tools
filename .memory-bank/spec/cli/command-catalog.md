# CLI command catalog (1:1 → executor)
Status: Draft (2026-09-24)

Цель: у каждой команды CLI ровно один исполнитель (задание или action), чтобы сценарии приёмки автоматизировались через CLI и повторяли поведение web.

Колонка «Состояние»: **факт** — команда реализована; **target** — появится в EP-001, имя может уточниться.

| Команда | Исполнитель | Нужные учётные данные | Пишет во внешние системы | Состояние |
|---|---|---|---|---|
| `task run <sheetUrl \| file.csv> [--save] [--out <file.csv>]` | `CompositeTableTaskExecutor` (тип задания берётся из листа) | Google (только для URL) + системы задания | только с `--save`; входной CSV не изменяется никогда, запись на лист при CSV-источнике идёт в `--out` | target (FT-0004, FT-0018) |
| `sheet export <sheetUrl> <file.csv>` | converter Google → CSV | Google | нет (пишет локальный файл) | target (FT-0016) |
| `sheet import <file.csv> <sheetUrl> [--overwrite]` | converter CSV → Google | Google | да (в Google Таблицу) | target (FT-0016) |
| `task list` | реестр типов заданий | — | нет | target (FT-0004) |
| `auth check [--system <brs|its|teamproject|partner|google>]` | пробные запросы на чтение `src/actions/checkSystemAuthAsync.ts` (их же вызывают сторы web); Google — обновление токена и `tokeninfo` | проверяемая система | нет | факт (FT-0003) |
| `google login` | `NodeGoogleAuth.loginAsync` (installed-app flow, токены в `secrets/google-tokens.json`) | `secrets/google.json` | нет | факт (FT-0003) |

Отдельной команды для переноса баллов в БРС нет: это табличное задание `PutMarksToBrs`, которое запускается через `task run` ([FT-0005](../../plans/features/FT-0005-put-marks-to-brs-task.md)).

Скрипт Partner → Notion (`cloneProjects`) в CLI не переносится: он не развивается и может быть удалён или переписан с заменой Notion на BuildIn.AI.

Разовые скрипты бывшего `src/main.ts` (запуск заданий с листом и параметрами в коде, `fillTechnologyCards`, `cloneProjects`) лежат в `src/legacyScripts.ts` и запускаются вручную (`npm run legacy-scripts`), CLI их не вызывает. Функции запуска заданий удаляются, когда их заменит `task run` (FT-0004).

Формат записи при добавлении команды: команда, исполнитель, учётные данные, пишет ли в системы.
