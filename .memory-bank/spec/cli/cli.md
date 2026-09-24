# CLI spec
Status: Draft (2026-09-24)

**Состояние:** каркас CLI на Commander есть (FT-0003): `src/cli/`, команды `auth check` и `google login`. Запуск заданий — `task run` и `task list` (FT-0004), запись на лист при CSV-источнике — `task run --out` (FT-0018). Конвертация Google ⇄ CSV (FT-0016) появится в следующих фичах [EP-001](../../plans/epics/EP-001-cli-and-observability.md). В `src/legacyScripts.ts` (`npm run legacy-scripts`) остались только разовые скрипты, которые не являются табличными заданиями. CLI их не вызывает.

## Зачем
Чтобы разработчик и ИИ-агент могли запускать задания без UI и автоматически проверять результат. CLI — основа интеграционных тестов ([EP-002](../../plans/epics/EP-002-automated-tests.md)).

## Принципы
- Каждая команда поддерживает human output (по умолчанию) и `--json` со стабильной схемой.
- При `--json` в stdout только JSON; человекочитаемые сообщения — в отдельном поле `message`.
- Ошибки машиночитаемы: `code + message + details`, ненулевой код выхода.
- Режим по умолчанию — try; запись только с явным `--save`.
- CLI — тонкий клиент поверх того же движка заданий, что и web: без собственной доменной логики.
- Реализация — на Commander ([ADR-0004](../../adr/ADR-0004-cli-commander.md)).
- Задание берётся из Google Таблицы (URL) или из CSV-файла (путь) с той же разметкой ([Table sources](../domain/table-sources.md)). Для CSV учётная запись Google не нужна.
- Учётные данные — только из `.env` / `secrets/` (или переменных окружения), никогда из кода.
- Развитая справка с примерами (`--help` у каждой команды): CLI должен быть понятен ИИ-агенту без чтения кода.

## Запуск
- `npm run -s cli -- <команда> [опции]` — сборка (`tsc`) и запуск `build/cli/main` через `--loader ./loader.js`. Флаг `-s` убирает служебный вывод npm, чтобы при `--json` в stdout был только JSON.
- Без пересборки: `node --no-warnings --loader ./loader.js build/cli/main <команда>`.
- Справка: `--help` у программы и у каждой команды, с примерами; `--json` — глобальная опция, её можно указывать после команды.

## Каркас (`src/cli/`)
- `main.ts` — точка входа; `program.ts` — регистрация команд на Commander и разбор ошибок вызова; `runCommand.ts` — единая обёртка обработчика команды; `output.ts` — вывод и коды выхода; `errors.ts` — коды ошибок и приведение исключений к `code + message + details`; `commands/` — по файлу на группу команд.
- Новая команда регистрируется в `program.ts` и выполняется через `runCommandAsync`: обработчик возвращает `CommandOutput` (`ok`, `message`, `result`, опционально `text` для human-вывода) или бросает исключение — остальное делает каркас.
- `console.log` / `info` / `debug` перенаправлены в stderr: stdout занят результатом команды, диагностика API-клиентов его не портит.

## Вывод и коды выхода
- Human (по умолчанию): результат — в stdout, ошибка — в stderr строкой `Ошибка <CODE>: <message>` и строками `details`.
- `--json`: в stdout один объект `{ command, ok, message, result }`; при ошибке — `{ command, ok: false, message, error: { code, message, details } }`. Для ошибок разбора аргументов `command = null`.
- Коды выхода: `0` — успех; `1` — команда выполнена с отрицательным результатом (например, `auth check` нашёл проблемы) или завершилась ошибкой; `2` — неверный вызов (`USAGE_ERROR`).

## Коды ошибок
| Код | Когда |
|---|---|
| `USAGE_ERROR` | неизвестная команда или опция, недопустимое значение, не хватает аргумента, группа (`auth`) без подкоманды; `details.commanderCode` — код Commander. `task run --out`: `details.option = --out`, `details.reason`: `google-source` (источник — URL Google Таблицы), `same-as-source` (путь совпадает с входным CSV) |
| `CREDENTIALS_MISSING` | учётные данные не заданы; в `details` — `system` и `variables` (имена переменных) или `files` (для Google) |
| `CREDENTIALS_INVALID` | учётные данные заданы, но файл не читается / неверного формата или система их не приняла; `details.reason` — причина, если есть |
| `NETWORK_ERROR` | система не ответила: сетевая ошибка или таймаут |
| `LOGIN_CANCELLED` | `google login`: код авторизации не введён |
| `TASK_SOURCE_INVALID` | `task run`: задание не прочитано. `details.source` — аргумент, `details.reason`: `not-found` (нет файла), `bad-url` (URL не указывает лист: нужен `#gid=`), `sheet-not-found` (в таблице нет листа с таким `gid`), `no-task` (на листе не заполнен параметр `task`) |
| `INTERNAL_ERROR` | прочие исключения (в `auth check` — статус `error`) |

Значения секретов не попадают ни в `message`, ни в `details`.

## Результат выполнения задания (`task run`)
`result` в конверте `--json`:
- `task`, `mode` (`try` | `save`);
- `out` — путь выходного файла, только если указан `--out` (см. ниже);
- `events[]` — события исполнителя (FT-0002): `outcome` с `status` (`changed` | `unchanged` | `skipped` | `warning` | `error`), `scope` (проект/студент/техкарта…), `message`, `details`, плюс служебные события текстового лога. SSoT модели и соответствия статусов эмодзи — [Execution events](../domain/tasks/execution-events.md);
- `summary`: `counts` — элементарные результаты по статусам, `verdicts` — итоги стадий (`ok` / `attention` / `failed`), `ok` (bool); см. [Execution events](../domain/tasks/execution-events.md#сводка).

`ok` конверта равен `summary.ok`; если `summary.ok = false`, код выхода 1. `message` — итог одной строкой: `<task> (<mode>): выполнено | есть ошибки. changed N, unchanged N, skipped N, warning N, error N` и, если есть, `failed verdicts N`.

Human-вывод — те же строки, что в web-логе, по мере выполнения, последней строкой — `message`.

Ошибки, из-за которых задание не выполнено, — это события, а не ошибка команды: результат с уже полученными событиями сохраняется. Такое событие — `outcome` со `status = error` и `stopped = true`, `scope` — имя задания:
- неизвестный тип задания — `Unknown task "<name>"`;
- нет учётных данных системы, которая нужна заданию: `details.code = CREDENTIALS_MISSING` (или `CREDENTIALS_INVALID`), `details.system`, `details.variables` — имена переменных через запятую;
- с `--out`: выходной файл не записан (например, нет каталога) — `Не удалось записать <out>: …`, `details.code` по таблице кодов, `details.out` (без `stopped`: задание уже выполнено);
- исключение во время выполнения (сеть, дефект) — `details.code` по таблице кодов ошибок, остальные поля `details` — как у ошибки команды.

Ошибка команды (конверт с `error`) — только если задание не прочитано (`TASK_SOURCE_INVALID`) или не получен доступ к Google для URL (`CREDENTIALS_*`, `NETWORK_ERROR`).

`warning` — действие пропущено по ограничению окружения: запись на лист при CSV-источнике без `--out` (FT-0018). `scope` и `details.range` — диапазон блока (`D1:L3`), `details.values` — значения блока CSV-текстом, `message` — подсказка указать `--out`; `summary.ok` не меняется.

### Запись на лист при CSV-источнике (`--out`)
Правила — [Table sources](../domain/table-sources.md#запись-результатов-заданий); читать, чтобы знать формат выходного файла и `details`.
- `task run <file.csv> --out <result.csv>`: запись на лист идёт в сетку в памяти, после выполнения задания весь лист (входная сетка + записанные блоки) пишется в `<result.csv>` — в try и в save, в том числе если задание завершилось ошибкой (как лист Google сохраняет уже записанные блоки). Существующий файл перезаписывается.
- Входной CSV не изменяется никогда: `--out`, совпадающий с входным файлом, — `USAGE_ERROR` (`reason = same-as-source`, код выхода 2). Файлы считаются одним, если совпадают нормализованные абсолютные пути или (когда оба файла есть) их `dev` + `ino`: так ловятся символические и жёсткие ссылки и регистронезависимые файловые системы.
- `--out` с URL Google Таблицы — `USAGE_ERROR` (`reason = google-source`, код выхода 2) до обращения к Google: Google-лист пишется сам, молчаливый игнор флага скрыл бы ошибку вызова.
- Без `--out` задание выполняется так же, но запись на лист заменяется событием `warning`; файлов не создаётся.

Учётные данные систем УрФУ читаются лениво: только для систем, нужных заданию (см. `task list`). Для CSV-источника Google не нужен, для URL нужны сохранённые токены (`google login`).

## Учётные данные
Все команды берут учётные данные систем УрФУ из одного загрузчика — `NodeCredentials` (`src/apis/NodeCredentials.ts`). Переменные и форматы — в [Stack & tooling](../project/stack-and-tooling.md#конфигурация-и-секреты). Читать, чтобы не заводить второй способ передачи секретов.
При ошибке загрузчик бросает `CredentialsError` (`kind`, `system`, `variables`): `kind = missing` CLI превращает в `CREDENTIALS_MISSING`, `kind = invalid` (файл не читается или неверного формата) — в `CREDENTIALS_INVALID`; имена переменных — в `details`.

`auth check` проверяет каждую систему пробным запросом на чтение (`src/actions/checkSystemAuthAsync.ts`, те же запросы использует web при входе) и возвращает `result.systems[]`: `system`, `title`, `status`, `code`, `message`, `details`. Статусы: `ok` — данные приняты; `missing` — не заданы (`CREDENTIALS_MISSING`); `invalid` — не приняты или файл неверный (`CREDENTIALS_INVALID`); `unreachable` — система не ответила (`NETWORK_ERROR`), про данные ничего не известно; `error` — пробный запрос упал по другой причине (`INTERNAL_ERROR`, причина в `details`): дефект или изменившийся API, а не учётные данные. Ответ страницей входа (JSON не разбирается, БРС — `… is Forbidden`) считается `invalid`. Google проверяется по `secrets/google.json` и сохранённым токенам (`secrets/google-tokens.json`): токен обновляется и проверяется запросом `tokeninfo`.

SSoT соответствия «команда → исполнитель»: [Command catalog](command-catalog.md). Читать, чтобы одна команда не размазывалась по нескольким исполнителям и чтобы тесты повторяли поведение UI.
