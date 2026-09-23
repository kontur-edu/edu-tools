# FT-0005 — Перенос баллов в БРС как табличное задание
Status: Draft (2026-09-23)

## Feature FT-0005 — Перенос баллов в БРС как табличное задание
Epic: `EP-001`. Status: `Planned`.
Triage: `ready-for-agent`.
Blocked by: FT-0002, FT-0004, FT-0015.

### User value
Преподаватель переносит баллы в БРС из листа Google Таблицы в web, а разработчик и ИИ-агент — через `task run` из Google или CSV, с проверкой в try. Больше не нужно править и вручную запускать `putMarks.sample.ts`.

### Deliverables
- **Дополнительные колонки (`$$`)** в общем разборе табличного задания по [ADR-0006](../../adr/ADR-0006-extra-columns.md): упорядоченный список `$$`-колонок с исходными заголовками и значения по строкам; повторы разрешены; точка — часть названия; строка пустая, только если пусты все `$`- и `$$`-значения; задания, не ожидающие `$$`, их игнорируют.
- **Задание `PutMarksToBrs`**, зарегистрированное в `CompositeTableTaskExecutor` (значит, доступно и в web, и через `task run`):
  - параметры (`$keys`/`$values`): `discipline` (обязателен), `academicYear` (обязателен, `2024/2025`), `semester` (обязателен, `fall`/`spring`), `studyYear` (целое; не задан → `0` = все курсы), `isModule` (bool, по умолчанию false), `defaultFailure` (русская подпись причины отсутствия из БРС; по умолчанию «-»);
  - колонки: `$group` (группа в БРС), `$student` (фамилия и имя в БРС), `$failure` (причина отсутствия), `$$<контрольное мероприятие>` — балл по мероприятию; одинаковые названия сопоставляются с мероприятиями БРС по порядку, сравнение названий нормализованное;
  - нет обязательного параметра → `- <param> required❗`, задание не выполняется (как в других заданиях); нераспознанная причина отсутствия — как сейчас, «-».
- Задание собирает `MarksData` из `TableTask` и вызывает существующий путь `putMarksToBrsAsync` → `putMarksForDisciplineAsync`. Логика переноса не меняется, включая выставление причины по умолчанию студентам БРС, которых нет в листе.
- **Вывод отчёта:** в `putMarks*` вместо `console.log` передаётся функция вывода строки (механическая замена, без изменения логики); задание превращает каждую строку в текстовое событие без статуса (FT-0002). `summary` отражает только итог: выполнено или ошибка.
- `src/putMarks.sample.ts` удалён.
- Остаются без изменений как внутреннее API: `putMarksToBrsManualAsync` и сборка конфига для него; `buildAutoMarksConfigAsync` и `putMarksToBrsAutoAsync` (старая раскладка листа, вызовов нет).

### Out of scope
- Возможности `brs-extensions/`, которых нет в edu-tools: колонка «auto»/«баллы» с распределением итогового балла, конфиг из названия таблицы и несколько курсов на листе, группа по префиксу и автоопределение, раздельные колонки ФИО, дополнительные исключения студентов, повторная проверка записи. Это пункт roadmap «Перенос brs-extensions».
- Рефакторинг `putMarks*` и статусы событий по студентам.
- Автоматический перевод старых листов («Названия параметров» / «Значения параметров»).

### Context (SSoT links)
- [ADR-0006 — дополнительные колонки](../../adr/ADR-0006-extra-columns.md): правила `$$`-колонок. Читать перед изменением разбора.
- [Table task format](../../spec/domain/table-task-format.md): разметка листа и общие параметры. Читать, чтобы параметры задания разбирались как у остальных.
- [Glossary](../../spec/glossary.md): контрольное мероприятие, причина отсутствия, перенос баллов, дополнительные колонки. Читать, чтобы спека задания говорила теми же словами.
- [Task catalog](../../spec/domain/tasks/index.md): формат описания задания; сейчас перенос баллов — «вне каталога». Читать, чтобы добавить спеку задания.
- [ADR-0003 — try/save](../../adr/ADR-0003-try-save-modes.md): запись в БРС только в save. Читать, чтобы `save` передавался в `PutMarksOptions`.

### Implementation plan
- Разбор `$$` — в чистом парсере по сетке значений (FT-0015); `TableTask` получает список дополнительных колонок и их значения в строках.
- Задание: параметры → `DisciplineConfig` (`academicYear` → первый год, `semester` → `TermType`, `studyYear` → `course`, `defaultFailure` → `parseStudentFailure`); строки → `ActualStudent` (`fullName`, `groupName`, `failure`, `properties` — значения `$$`-колонок по порядку); `$$`-заголовки → `ControlActionConfig` с `propertyIndex`, а для повторов — `matchIndex`/`matchCount`, как в `buildAutoMarksConfigAsync`.
- `PutMarksOptions.save` берётся из режима (web: кнопка; CLI: `--save`).
- Удалить строку `brs put-marks` из каталога команд.

### Scenarios (acceptance)
#### Setup
- CSV-лист задания `PutMarksToBrs` тестовой дисциплины: параметры, 2–3 студента, колонки `$$домашняя работа` ×2 и `$$экзамен`; действующий `sid` БРС.
- CSV-лист без `semester`.
- Actors: разработчик / ИИ-агент; преподаватель в web.

#### Action
- `task run marks.csv --json` (try); `task run no-semester.csv --json`; тот же лист из Google в web кнопкой «Попробовать».

#### Assert
- Try: в `events[]` текст отчёта (группа, сопоставление студентов, баллы); в БРС нет изменений; `summary.ok = true`.
- Две колонки «домашняя работа» сопоставлены с двумя мероприятиями БРС по порядку.
- Без `semester`: `- semester required❗`, задание не выполняется, `summary.ok = false`.
- В web лог показывает тот же отчёт.

### Tests
- Unit: разбор `$$`-колонок (порядок, повторы, точка в названии, пустые строки, игнор в других заданиях); сборка `MarksData` из `TableTask` (параметры, `studyYear` по умолчанию `0`, повторы → `matchIndex`).
- Integration — в FT-0008 (EP-002).

### Definition of done
По [Feature template](../../mbb/templates/feature.md); дополнительно `npm run build`, `npm run web-build`, `npm run lint`, `npm test` зелёные.

### Docs updates (SSoT)
- [Table task format](../../spec/domain/table-task-format.md) — `$$`-колонки из target в факт.
- Новая спека задания `spec/domain/tasks/put-marks-to-brs.md` + строка в [Task catalog](../../spec/domain/tasks/index.md) вместо пункта «вне каталога»; в спеке — таблица «старый лист → новый».
- [Command catalog](../../spec/cli/command-catalog.md), [Repo structure](../../spec/project/repo-structure.md) — без `putMarks.sample.ts`.
