# Execution events
Status: Draft (2026-09-23)

Исполнители заданий (`src/tasks`) и actions, которые пишут в лог задания, сообщают о ходе выполнения **событиями**, а не строками. Из одного и того же потока событий строятся текстовый лог (web, консоль) и машиночитаемый результат (`--json` в CLI, тесты).

Код: модель и сводка — `src/tasks/TaskEvents.ts`, API для исполнителей — `src/tasks/TaskReporter.ts`, текстовый рендер — `src/tasks/TaskEventText.ts`.

## Модель
Событие `outcome` — результат обработки сущности. Только эти события входят в счётчики сводки.
- `status`: `changed` | `unchanged` | `skipped` | `warning` | `error`;
- `scope` — сущность, к которой относится событие (см. ниже);
- `message` — текст без эмодзи;
- `details` — необязательные значения (даты, оценки);
- `stopped` — обработка `scope` прекращена после этого события (только у `error`).

Служебные события — для структуры текстового лога:
- `started` / `finished` (`scope`, `message`) — начало и конец обработки задания или техкарты;
- `verdict` (`result`: `ok` | `attention` | `failed`, `scope`, `message`) — вывод по сущности целиком («все студенты проекта оценены»). В счётчики не входит;
- `heading` (`level` 1–3, `message`) — заголовок раздела (проект, команда, итоги);
- `note` (`message`, `attention`) — информационная строка, например параметр задания;
- `separator` — пустая строка.

## Сводка
`summarizeTaskEvents` / `TaskEventCollector.getSummary()`: `counts` — число `outcome` по каждому статусу; `ok = true`, если нет `error` и нет `verdict` с `result = failed`.

## Текстовый рендер
| Событие | Строка |
|---|---|
| `outcome` `changed` | `🟢 message` |
| `outcome` `unchanged` / `skipped` | `🟡 message` |
| `outcome` `warning` | `⚠️ message` |
| `outcome` `error` | `🔴 message`, при `stopped` — `❌ message` |
| `verdict` `ok` / `attention` / `failed` | `🟩` / `🟨` / `🟥 message` |
| `started` / `finished` | `🚩 message` / `✅ message` |
| `heading` | `#`×level ` message` |
| `note` | `- message`, при `attention` — с `❗` в конце |
| `separator` | пустая строка |

Статус выбирается по смыслу сообщения, эмодзи — следствие статуса. Web подписывается на текстовый рендер (`textTaskEventListener`), Node-скрипты — на консольный (`TaskReporter.console()`).

## Scope
- задание: имя задания (`CreateTechnologyCards`) — для ошибок параметров, «Unknown task», «API is not available»;
- проект TeamProject: `Название (номер)`; итерация: `Название (номер) / Итерация`;
- студент ИТС: `ФИО (группа)`; студент TeamProject: значение `$student` из таблицы (или полное имя из TeamProject, если студента нет в таблице);
- техкарта: `disciplineLoad`.

## Ошибки движка
«Unknown task» и «<System> API is not available» из `CompositeTableTaskExecutor` — событие `error` со `stopped` и `scope` = имя задания. Прочие исключения по-прежнему пробрасываются.

## Отличия текстового лога от лога до событий
- новые строки `❌ Unknown task "…"` и `❌ … API is not available` (раньше только в консоли браузера);
- убраны лишние кавычки в конце сообщений DistributeStudentsIntoTeams (`…signed"` → `…signed`);
- `🟥 Iterations of project not found` → `❌ …`: это ошибка, прекращающая обработку проекта, а не вывод по проекту;
- `🟩 Техкарта согласована` → `🟢 …`: согласование — изменение техкарты (`changed`); недостижимая ветка `🟨 Техкарта уже согласована` → `🟡`.

## Известные ограничения
DistributeStudentsIntoTeams пишет часть строк напрямую в `console.log` (число студентов, проверка после записи «is not updated»). В web их нет, в события они не попадают.

Ссылки (аннотированные):
- [CLI spec](../../cli/cli.md): схема `--json`, которая строится из этих событий. Читать, чтобы результат CLI совпадал с моделью.
- [Task catalog](index.md): задания; спорные статусы — в спеке каждого задания. Читать при добавлении сообщений в лог.
