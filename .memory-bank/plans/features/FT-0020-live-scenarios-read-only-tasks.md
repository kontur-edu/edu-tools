# FT-0020 — Живые сценарии заданий, не пишущих на лист
Status: Draft (2026-09-24)

## Feature FT-0020 — Живые сценарии заданий, не пишущих на лист
Epic: `EP-002`. Status: `Planned`.
Triage: `ready-for-human`.
Blocked by: FT-0008.

### User value
Для каждого задания каталога, которое не пишет на лист, есть сквозной сценарий в try. Перед рефакторингом EP-003 можно одной командой убедиться, что задания по-прежнему находят те же расхождения в реальных системах.

### Deliverables
- Обезличенные CSV-фикстуры и живые сценарии в try на каркасе FT-0008 для `CreateTechnologyCards` (БРС), `DistributeStudentsIntoTeams` (ИТС), `CreateTeamProjectIterations` (TeamProject).
- В каждом сценарии проверяются `summary` (счётчики по статусам, `ok`) и ключевые события, а не полный текст лога.
- Записи `SC-XXXX` в [Scenario registry](../scenarios.md).

### Context (SSoT links)
- [FT-0008](FT-0008-cli-integration-harness.md): каркас и соглашения о фикстурах. Читать, чтобы сценарии были однотипны.
- [Create technology cards](../../spec/domain/tasks/create-technology-cards.md), [Distribute students into teams](../../spec/domain/tasks/distribute-students-into-teams.md), [Create team project iterations](../../spec/domain/tasks/create-team-project-iterations.md): правила заданий. Читать, чтобы выбрать данные, дающие и `changed`, и `unchanged`.
- [EP-002](../epics/EP-002-automated-tests.md): риск расхождения фикстур с реальными таблицами. Читать, чтобы получать фикстуры выгрузкой реальных листов.

### Implementation plan
- `ready-for-human`: фикстуры строятся из реальных листов (выгрузка через `sheet export` из FT-0016 или вручную) с обезличиванием, а проверка требует действующих учётных данных БРС, ИТС и TeamProject. Агент может подготовить код сценариев, данные и прогон делает человек.
- Ожидаемые значения `summary` фиксируются по первому прогону и сверяются с листом вручную.
- Данные в системах со временем меняются: сценарий должен опираться на стабильные объекты (архивные дисциплины, закрытые проекты) или проверять инварианты, а не точные счётчики.

### Scenarios (acceptance)
#### Setup
- Три обезличенные CSV-фикстуры; действующие учётные данные БРС, ИТС, TeamProject.
- Actors: разработчик.

#### Action
- `npm run test:integration`.

#### Assert
- Три новых сценария зелёные; в системах нет изменений (только try).
- Без учётных данных какой-либо системы её сценарий пропущен с именем переменной.

### Tests
- Integration: три сценария из Deliverables.

### Definition of done
По [Feature template](../../mbb/templates/feature.md); дополнительно живые сценарии пройдены с действующими учётными данными.

### Docs updates (SSoT)
- [Scenario registry](../scenarios.md) — новые сценарии.
