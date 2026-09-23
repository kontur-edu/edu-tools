# Issue tracker: меморибанк (`.memory-bank/plans`)

Спеки и тикеты этого репозитория живут markdown-файлами в `.memory-bank/plans/`. Все документы подчиняются правилам MBB (`.memory-bank/mbb/`): первая строка — `# Title`, вторая — `Status: <Draft|Active|Template|Superseded> (YYYY-MM-DD)`, на каждый документ есть аннотированная ссылка из индекса папки. После любых правок — `npm run docs:check`.

## Соответствие понятий скиллов

| В скиллах | Здесь |
| --- | --- |
| spec (`/to-spec`) | эпик `.memory-bank/plans/epics/EP-XXX-<kebab-name>.md` по шаблону `.memory-bank/mbb/templates/epic.md` |
| ticket / issue (`/to-tickets`, `/implement`, `/triage`) | фича `.memory-bank/plans/features/FT-XXXX-<kebab-name>.md` по шаблону `.memory-bank/mbb/templates/feature.md` |
| triage label | строка `Triage: <role>` в файле фичи (см. `docs/agents/triage-labels.md`) |
| blocking edges | строка `Blocked by: FT-XXXX, FT-XXXX` в файле фичи |
| comments | раздел `## Comments` в конце файла |

## Conventions

- **ID** сквозные по проекту и не переиспользуются. Следующий номер = максимальный `EP-XXX` / `FT-XXXX`, встречающийся в `plans/epics/*.md`, `plans/features/*.md` и `plans/roadmap.md`, плюс один.
- **Спека** (`/to-spec`): новый файл эпика + строка в `plans/epics/index.md` + место в `plans/roadmap.md`. Если спека расширяет существующий эпик — обновить этот эпик, а не заводить новый.
- **Тикет** (`/to-tickets`): файл фичи создаётся сразу, по одному на тикет. Строка фичи в разделе `Features` эпика становится ссылкой на него: `- [FT-XXXX — <Name>](../features/FT-XXXX-<name>.md) — ценность в одну строку`. Порядок в списке — порядок реализации.
- **Шапка файла фичи:**

  ```
  # FT-XXXX — <Name>
  Status: Draft (YYYY-MM-DD)

  ## Feature FT-XXXX — <Name>
  Epic: `EP-XXX`. Status: `Planned`.
  Triage: `ready-for-agent`.
  Blocked by: FT-XXXX, FT-XXXX.
  ```

  Строку `Blocked by:` опускать, если блокеров нет. Вторая строка (`Status: Draft …`) — статус документа по MBB, её не трогать ради триажа.
- **Блокировки:** фича разблокирована, когда у всех фич из `Blocked by:` статус `Done`.
- **Прогресс:** статус фичи `Planned → In progress → Done` обновляется и в файле фичи, и в эпике. При `Done` — строка в `plans/verification-matrix.md`, обновления `spec/*` и `adr/*` (см. `plans/how-we-plan.md`).
- **Отказ:** `Triage: \`wontfix\``, статус документа `Superseded (YYYY-MM-DD)`, причина — в `## Comments`.
- **Коммиты** помечаются `[FT-XXXX]` / `[EP-XXX]`.

## When a skill says "publish to the issue tracker"

Создать файл эпика (спека) или фичи (тикет) по правилам выше, поставить ссылки из индексов, запустить `npm run docs:check`.

## When a skill says "fetch the relevant ticket"

Пользователь передаёт `FT-XXXX` / `EP-XXX` или путь. Прочитать `.memory-bank/plans/features/FT-XXXX-*.md` (или `plans/epics/EP-XXX-*.md`) и родительский эпик фичи.

## Wayfinding operations

Used by `/wayfinder`. Карта и её тикеты живут в меморибанке.

- **Map**: `.memory-bank/plans/wayfinding/<effort>/map.md` со статусом `Draft`, телом Notes / Decisions so far / Fog и строкой в `.memory-bank/plans/wayfinding/index.md`.
- **Child ticket**: `.memory-bank/plans/wayfinding/<effort>/NN-<slug>.md`, нумерация с `01`, вопрос — в теле. После заголовка и `Status: Draft (YYYY-MM-DD)` идут строки `Type:` (`research`/`prototype`/`grilling`/`task`) и `State: open|claimed|resolved`. Карта ссылается на каждый тикет (иначе `docs:check` сочтёт его сиротой).
- **Blocking**: строка `Blocked by: NN, NN`. Тикет разблокирован, когда все перечисленные в `State: resolved`.
- **Frontier**: тикеты с `State: open`, без незакрытых блокеров; первый по номеру побеждает.
- **Claim**: выставить `State: claimed` и сохранить до начала работы.
- **Resolve**: ответ под заголовком `## Answer`, `State: resolved`, затем указатель (суть + ссылка) в Decisions so far карты. Долговечные решения уходят в ADR / spec.
- **Handoff**: когда туман рассеян — `/to-spec` собирает эпик; карта получает `Status: Superseded (YYYY-MM-DD)` и ссылку на эпик.
