# EP-001 — CLI и наблюдаемость
Status: Active (2026-09-23)

## Epic EP-001 — CLI и наблюдаемость
Status: `Planned`.

### Goal (user value)
Разработчик и ИИ-агент запускают любое задание без UI одной командой и получают машиночитаемый результат: что изменено, что без изменений, где ошибки. Это основа автоматической проверки кода ИИ-агентами.

### Scope (in / out)
- In scope: замена `src/main.ts` на CLI; структурированные события выполнения вместо «голого» текстового лога; загрузка учётных данных Node из `.env` / `secrets/`; удаление захардкоженных секретов; CSV как второй источник заданий и конвертация Google ⇄ CSV; перенос баллов в БРС как табличное задание вместо ручного запуска `putMarks.sample.ts`.
- Out of scope: тесты (EP-002), перестройка слоёв (EP-003), изменения в web UI, кроме перехода на события; скрипт Partner → Notion (`cloneProjects`) — не развивается, в CLI не переносится и не тестируется.

### Features (vertical slices)
Порядок в списке — порядок реализации (ID выдаются по мере появления фич и не отражают порядок). Блокировки — строка `Blocked by:` в файле фичи; FT-0001, FT-0002 и FT-0015 (после FT-0006) можно делать параллельно.
- [FT-0001 — Секреты вне кода](../features/FT-0001-secrets-out-of-code.md) — учётные данные Node из `.env` / `secrets/`, в коде нет `sid`, токенов и кук.
- [FT-0002 — Структурированные события выполнения](../features/FT-0002-structured-execution-events.md) — исполнители сообщают события (`status`, `scope`, `message`, `details`); текстовый лог в web строится из событий и внешне не меняется.
- [FT-0015 — Разбор задания по сетке значений и CSV-источник](../features/FT-0015-grid-parser-and-csv-source.md) — CSV codec, чистый разбор `string[][] → TableTask`, источники Google / CSV / in-memory; поведение для Google не меняется. Blocked by FT-0006 (EP-002).
- [FT-0003 — Каркас CLI на Commander](../features/FT-0003-cli-skeleton-commander.md) — `--help` с примерами, human/`--json`, коды выхода, `auth check`, `google login`.
- [FT-0004 — Запуск заданий из CLI](../features/FT-0004-task-run-from-cli.md) — `task run <sheetUrl | file.csv> [--save]`, `task list`, результат в `--json`.
- [FT-0018 — Запись на лист при CSV-источнике](../features/FT-0018-csv-sheet-write-out.md) — `--out <file.csv>` для заданий, пишущих на лист; без `--out` — `warning`.
- [FT-0016 — Конвертация Google ⇄ CSV](../features/FT-0016-google-csv-conversion.md) — `sheet export`, `sheet import`; круговая конвертация сохраняет значения.
- [FT-0005 — Перенос баллов в БРС как табличное задание](../features/FT-0005-put-marks-to-brs-task.md) — задание `PutMarksToBrs` (web и `task run`) с контрольными мероприятиями в `$$`-колонках вместо ручного запуска `putMarks.sample.ts`.

### Dependencies
- External: действующие учётные данные систем УрФУ у разработчика; Google-аккаунт — только для запуска из Google Таблиц и конвертации (для CSV не нужен).
- Internal: FT-0015 заблокирована FT-0006 (unit-инфраструктура, [EP-002](EP-002-automated-tests.md)), чтобы CSV-модули сразу шли с тестами.

### Risks & mitigations
- Risk: общий `src/` собирается и CRA, и `tsc` для Node → Mitigation: CLI не импортирует `src/components` и `src/stores`.
- Risk: Google- и CSV-источники разойдутся в поведении → Mitigation: вся разметка разбирается в одном чистом парсере по сетке значений; эквивалентность проверяется тестами (EP-002).
- Risk: CLI и web по-разному вызывают движок заданий → Mitigation: CLI вызывает тот же `CompositeTableTaskExecutor`; библиотека CLI — Commander ([ADR-0004](../../adr/ADR-0004-cli-commander.md)).

### Definition of done
- Все фичи имеют сценарии (setup → action → assert).
- Каждое задание из каталога запускается через `task run` из Google Таблицы и из CSV в режиме try и возвращает валидный `--json`; для одинаковых данных результаты совпадают.
- В коде нет учётных данных.
- [CLI spec](../../spec/cli/cli.md) и [Command catalog](../../spec/cli/command-catalog.md) приведены к фактическому состоянию.
