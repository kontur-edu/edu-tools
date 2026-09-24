# FT-0019 — Unit-тесты для сделанного в EP-001
Status: Draft (2026-09-24)

## Feature FT-0019 — Unit-тесты для сделанного в EP-001
Epic: `EP-002`. Status: `Done` (2026-09-24). Seams уже были (`CredentialsEnvironment` у `NodeCredentials`, пробы — параметр `checkSystemsAsync`). Изменения кода: `.env` загружается в `NodeCredentials.fromProcess()`, а не при импорте модуля, чтобы тесты его не читали; `auth check` со статусом `error` теперь кладёт причину в `details.reason`, как требует [CLI spec](../../spec/cli/cli.md).
Triage: `ready-for-agent`.
Blocked by: FT-0006.

### User value
Уже готовые части EP-001 — загрузка учётных данных, события выполнения, вывод CLI — страхуются тестами. ИИ-агент, меняющий их, сразу видит регрессию, а не узнаёт о ней при ручном прогоне.

### Deliverables
Unit-тесты, отложенные в [Verification matrix](../verification-matrix.md) «после FT-0006»:
- FT-0001: `NodeCredentials` — значение из переменной; нет значения (`CredentialsError`, `kind = missing`, имена переменных, без значения секрета); значение из файла; `secrets/brs.json` с `BRS_USER` и с единственной записью; неверный файл (`kind = invalid`).
- FT-0002: текстовый рендер набора событий (`TaskEventText`) и сводка по статусам (`TaskEvents`).
- FT-0003: `renderJson`, `renderHumanError`, `exitCodeFor` (CLI output), `toCliError` (CLI errors), `checkSystemsAsync` на фейковых пробах систем.

### Context (SSoT links)
- [Verification matrix](../verification-matrix.md): строки FT-0001…FT-0003 с перечнем тестов. Читать как чек-лист.
- [Execution events](../../spec/domain/tasks/execution-events.md): статусы, сводка, текстовый рендер. Читать, чтобы тесты проверяли спецификацию, а не детали реализации.
- [CLI spec](../../spec/cli/cli.md): схема `--json`, коды выхода, коды ошибок. Читать для тестов вывода CLI.
- [Stack & tooling](../../spec/project/stack-and-tooling.md): правила `NodeCredentials`. Читать для тестов учётных данных.

### Implementation plan
- Тесты не читают реальные `.env` и `secrets/`: окружение и файлы подставляются в тесте (временная папка или инъекция).
- Если модуль нельзя протестировать без реальной системы — минимальный seam (параметр с пробой/окружением по умолчанию) без изменения поведения.

### Scenarios (acceptance)
#### Setup
- Репозиторий после FT-0006, без `.env` и `secrets/`.
- Actors: ИИ-агент.

#### Action
- `npm test`.

#### Assert
- Все тесты из Deliverables проходят без сети и без учётных данных.
- Ни один тест не выводит значение секрета (проверяется утверждением на текст ошибки).

### Tests
- Unit: перечислены в Deliverables.

### Definition of done
По [Feature template](../../mbb/templates/feature.md); дополнительно `npm test`, `npm run build`, `npm run lint` зелёные.

### Docs updates (SSoT)
- [Verification matrix](../verification-matrix.md) — в строках FT-0001…FT-0003 указать фактические пути тестов вместо «после FT-0006».
