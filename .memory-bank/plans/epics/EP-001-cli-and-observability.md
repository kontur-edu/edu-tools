# EP-001 — CLI и наблюдаемость
Status: Active (2026-09-23)

## Epic EP-001 — CLI и наблюдаемость
Status: `Planned`.

### Goal (user value)
Разработчик и ИИ-агент запускают любое задание без UI одной командой и получают машиночитаемый результат: что изменено, что без изменений, где ошибки. Это основа автоматической проверки кода ИИ-агентами.

### Scope (in / out)
- In scope: замена `src/main.ts` на CLI; структурированные события выполнения вместо «голого» текстового лога; загрузка учётных данных Node из `.env` / `secrets/`; удаление захардкоженных секретов; CSV как второй источник заданий и конвертация Google ⇄ CSV; CLI-команда для переноса баллов в БРС вместо ручного запуска `putMarks.sample.ts`.
- Out of scope: тесты (EP-002), перестройка слоёв (EP-003), изменения в web UI, кроме перехода на события; скрипт Partner → Notion (`cloneProjects`) — не развивается, в CLI не переносится и не тестируется.

### Features (vertical slices)
Порядок в списке — порядок реализации (ID выдаются по мере появления фич и не отражают порядок).
- FT-0001 — Секреты вне кода — удалить токены и куки из `src/main.ts` (они уже истекли, ротация не нужна), учётные данные Node читать из `.env` / `secrets/`.
- FT-0002 — Структурированные события выполнения — исполнители сообщают события (`status`, `scope`, `message`, `details`); текстовый лог в web строится из событий и внешне не меняется.
- FT-0003 — Каркас CLI на Commander — разбор команд, `--help` с примерами, human/`--json`, коды выхода, `auth check`, `google login`.
- FT-0015 — Разбор задания по сетке значений и CSV-источник — CSV codec, чистый разбор `string[][] → TableTask`, источники Google / CSV / in-memory; поведение для Google не меняется. См. [Table sources](../../spec/domain/table-sources.md).
- FT-0004 — Запуск заданий из CLI — `task run <sheetUrl | file.csv> [--save] [--out <file.csv>]`, `task list`.
- FT-0016 — Конвертация Google ⇄ CSV — `sheet export`, `sheet import`; круговая конвертация сохраняет значения.
- FT-0005 — Перенос баллов в БРС как команда — `brs put-marks` вместо ручного запуска `putMarks.sample.ts`.

### Dependencies
- External: действующие учётные данные систем УрФУ у разработчика; Google-аккаунт — только для запуска из Google Таблиц и конвертации (для CSV не нужен).
- Internal: нет.

### Risks & mitigations
- Risk: общий `src/` собирается и CRA, и `tsc` для Node → Mitigation: CLI не импортирует `src/components` и `src/stores`.
- Risk: Google- и CSV-источники разойдутся в поведении → Mitigation: вся разметка разбирается в одном чистом парсере по сетке значений; эквивалентность проверяется тестами (EP-002).
- Risk: CLI и web по-разному вызывают движок заданий → Mitigation: CLI вызывает тот же `CompositeTableTaskExecutor`; библиотека CLI — Commander ([ADR-0004](../../adr/ADR-0004-cli-commander.md)).

### Definition of done
- Все фичи имеют сценарии (setup → action → assert).
- Каждое задание из каталога запускается через `task run` из Google Таблицы и из CSV в режиме try и возвращает валидный `--json`; для одинаковых данных результаты совпадают.
- В коде нет учётных данных.
- [CLI spec](../../spec/cli/cli.md) и [Command catalog](../../spec/cli/command-catalog.md) приведены к фактическому состоянию.
