# EP-002 — Автотесты
Status: Active (2026-09-24)

## Epic EP-002 — Автотесты
Status: `In progress`.

### Goal (user value)
Изменения проверяются автоматически: unit-тесты страхуют правила заданий, интеграционные тесты через CLI подтверждают сквозное поведение. ИИ-агент может сам убедиться, что ничего не сломал.

### Scope (in / out)
- In scope: рабочий pre-commit хук; тестовый раннер и `npm test`; unit-тесты чистых функций и разбора листа; unit-тесты исполнителей с фейками; интеграционные сценарии через CLI; CI (lint + тесты).
- Out of scope: e2e-тесты web UI; тесты `brs-extensions/` и `cors-proxy/`.

### Features (vertical slices)
Порядок в списке — порядок реализации. Блокировки — строка `Blocked by:` в файле фичи; после FT-0006 можно параллельно делать FT-0019, FT-0009 и FT-0008 (последняя ждёт ещё FT-0004).
- [FT-0017 — Рабочий pre-commit](../features/FT-0017-working-pre-commit.md) — быстрые проверки (lint, `docs:check`, Prettier для `src/`) на каждом коммите. `Done`.
- [FT-0006 — Unit-инфраструктура](../features/FT-0006-unit-test-infrastructure.md) — раннер (ADR), `npm test` в pre-commit, первые тесты на чистые хелперы. Блокер FT-0015 (EP-001), чтобы CSV-модули сразу шли с тестами. `Done`.
- [FT-0019 — Unit-тесты для сделанного в EP-001](../features/FT-0019-ep-001-unit-tests.md) — отложенные тесты FT-0001…FT-0003 из verification matrix: учётные данные, события, вывод CLI.
- [FT-0009 — CI](../features/FT-0009-ci.md) — lint, `docs:check`, сборки и `npm test` на каждый push/PR (дублирует pre-commit на случай, если хук обойдён или не установлен).
- [FT-0008 — Каркас интеграционных тестов через CLI](../features/FT-0008-cli-integration-harness.md) — `task run <file.csv> --json` как процесс; офлайн-сценарии в `npm test`, живые в try по требованию; первый сценарий `SendCuratorMarks`. `Done`; живой прогон отложен: в TeamProject нет тестовых данных.
- [FT-0020 — Живые сценарии заданий, не пишущих на лист](../features/FT-0020-live-scenarios-read-only-tasks.md) — сценарии в try для `CreateTechnologyCards`, `DistributeStudentsIntoTeams`, `CreateTeamProjectIterations`.
- [FT-0021 — Сценарий ExportTechnologyCards с эталонным `--out`](../features/FT-0021-export-technology-cards-scenario.md) — сравнение результата записи на лист с эталонным CSV.
- [FT-0007 — Unit-тесты исполнителей на фейковых адаптерах](../features/FT-0007-executor-unit-tests-with-fakes.md) — фейки портов, инвариант «try не пишет» для каждого исполнителя (зависит от портов из FT-0010).

Интеграционный сценарий `PutMarksToBrs` (SC-0008 в [Scenario registry](../scenarios.md)) отложен из [FT-0005](../features/FT-0005-put-marks-to-brs-task.md) до каркаса FT-0008: добавляется, когда каркас готов.

### Dependencies
- Internal: FT-0008 — после EP-001 (FT-0004); FT-0021 — после FT-0018 (EP-001); FT-0007 — вместе с EP-003 (FT-0010).
- External: тестовые данные во внешних системах УрФУ для интеграционных сценариев (только чтение, режим try). Google-аккаунт не нужен: задания берутся из CSV.

### Risks & mitigations
- Risk: интеграционные тесты зависят от живых систем УрФУ и истекающих учётных данных → Mitigation: только try-режим, запуск по требованию, а не на каждый push.
- Risk: CSV-фикстуры расходятся с реальными таблицами → Mitigation: фикстуры получаются выгрузкой реальных листов через `sheet export` (с обезличиванием данных студентов).
- Risk: CRA-раннер (`react-scripts test`) плохо подходит для Node-кода → Mitigation: в FT-0006 выбран Vitest, решение зафиксировано в [ADR-0007](../../adr/ADR-0007-vitest-test-runner.md).

### Definition of done
- Все фичи имеют сценарии (setup → action → assert).
- `npm test` запускает unit-тесты локально и в CI.
- Для каждого задания из каталога есть хотя бы один интеграционный сценарий через CLI.
- [Verification matrix](../verification-matrix.md) заполнена для фич EP-001…EP-003.
