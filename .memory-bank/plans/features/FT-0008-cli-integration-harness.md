# FT-0008 — Каркас интеграционных тестов через CLI
Status: Draft (2026-09-24)

## Feature FT-0008 — Каркас интеграционных тестов через CLI
Epic: `EP-002`. Status: `Done` (2026-09-24). Исключение из DoD: живые SC-0014 и SC-0015 с действующим `TEAMPROJECT_JWT` не прогонялись, потому что в TeamProject сейчас нет данных для теста. Проверено только поведение без учётных данных (пропуск) и с недействительным токеном (падение). Живой прогон отложен до появления тестового проекта.
Triage: `ready-for-agent`.
Blocked by: FT-0006, FT-0004.

### User value
ИИ-агент проверяет сквозное поведение заданий той же командой, что и человек: `task run <file.csv> --json`. Офлайн-сценарии идут в `npm test` на каждом коммите; живые сценарии в try запускаются одной командой по требованию и честно сообщают, если учётных данных нет.

### Deliverables
- Каркас: тест запускает собранный CLI как отдельный процесс (`task run`, `task list` с `--json`), разбирает stdout как JSON, проверяет `summary`, статусы событий и exit code.
- Два вида сценариев:
  - **офлайн** (без учётных данных и сети): `task list --json`; `task run` с CSV неизвестного типа задания (событие `error`, `summary.ok = false`, ненулевой exit code). Входят в `npm test`.
  - **живые** (try, реальные системы УрФУ): отдельная команда (например, `npm run test:integration`); сценарий пропускается с сообщением, каких переменных не хватает (по `auth check`), а не падает.
- Первый живой сценарий: `SendCuratorMarks` из обезличенной CSV-фикстуры в try.
- Фикстуры — CSV-файлы в репозитории, соглашение о папке и именовании.
- Первые записи `SC-XXXX` в [Scenario registry](../scenarios.md).

### Context (SSoT links)
- [Scenario registry](../scenarios.md): формат записи сценария. Читать, чтобы заполнить реестр.
- [CLI spec](../../spec/cli/cli.md): схема `--json`, коды выхода. Читать, чтобы проверки опирались на контракт.
- [Command catalog](../../spec/cli/command-catalog.md): `task run`, `task list`. Читать, чтобы знать аргументы.
- [Table sources](../../spec/domain/table-sources.md): формат CSV. Читать, чтобы фикстуры были валидны.
- [ADR-0003 — try/save](../../adr/ADR-0003-try-save-modes.md): живые сценарии только в try. Читать, чтобы тесты ничего не меняли в системах.
- [Send curator marks](../../spec/domain/tasks/send-curator-marks.md): задание первого живого сценария. Читать, чтобы составить фикстуру.

### Implementation plan
- Живые сценарии никогда не передают `--save`; это проверяется в самом каркасе (запрет флага).
- Фикстуры не содержат персональных данных: ФИО и идентификаторы обезличены или взяты из тестовых данных.
- Сборка CLI перед прогоном — один раз на запуск, не на каждый сценарий.

### Реализация (факт)
- Каркас — `src/testing/cliProcess.ts` (только для тестов, в сборку не входит): `runOfflineCliAsync` — CLI без учётных данных (переменные `*_JWT`/`*_SID`/`*_FILE`… убраны из окружения, рабочая папка временная, чтобы не подхватился `.env`); `runLiveCliAsync` — с учётными данными репозитория, `--save` отклоняется до запуска процесса; `missingCredentialsAsync(system)` — причина пропуска по `auth check --system <system> --json` (`missing` → пропуск, `invalid` / `unreachable` → падение).
- CLI собирается один раз на прогон (`globalSetup` `src/testing/buildCli.globalSetup.ts`) в `.cache/cli-build/`, а не в `build/`: сценарии не затирают сборку web и `npm run build`.
- Офлайн-сценарии — `src/**/*.scenario.test.ts`, отдельный Vitest project `scenarios` в `vitest.config.ts`, входят в `npm test` (сборка добавляет к прогону ~10 с). Живые — `src/**/*.live.test.ts`, `vitest.live.config.ts`, `npm run test:integration`, reporter `verbose` печатает причину пропуска.
- Фикстуры — `src/cli/scenarios/fixtures/<SC-XXXX>-<slug>.csv`, обезличенные. Живой SC-0014 ссылается на несуществующий проект: результат не зависит от данных TeamProject, прогон проверяет авторизацию и чтение списка рабочих пространств. Итерации, оценки и сравнение с таблицей проверяет SC-0015. Он работает по локальному CSV тестового проекта (`TEST_SEND_CURATOR_MARKS_CSV`, в репозиторий не коммитится) и делает два прогона try: одинаковые outcome-события в обоих прогонах подтверждают, что в TeamProject ничего не записано.

### Scenarios (acceptance)
#### Setup
- CSV неизвестного типа задания; CSV-фикстура `SendCuratorMarks`; окружение без учётных данных и окружение с `TEAMPROJECT_JWT`.
- Actors: ИИ-агент.

#### Action
- `npm test`; `npm run test:integration` без учётных данных; то же с учётными данными.

#### Assert
- `npm test` включает офлайн-сценарии и зелёный без сети.
- Без учётных данных живой сценарий помечен пропущенным с именем недостающей переменной, exit code 0.
- С учётными данными живой сценарий зелёный, в TeamProject нет изменений.

### Tests
- Integration: офлайн-сценарии и живой `SendCuratorMarks`.

### Definition of done
По [Feature template](../../mbb/templates/feature.md); дополнительно `npm test`, `npm run build`, `npm run lint` зелёные, живой сценарий пройден с действующими учётными данными.

### Docs updates (SSoT)
- [Scenario registry](../scenarios.md) — первые сценарии, «Состояние» к факту.
- [Stack & tooling](../../spec/project/stack-and-tooling.md) — команда живых сценариев.
- [Verification matrix](../verification-matrix.md) — как запускать интеграционные сценарии.
