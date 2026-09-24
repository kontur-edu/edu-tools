# FT-0017 — Рабочий pre-commit
Status: Draft (2026-09-24)

## Feature FT-0017 — Рабочий pre-commit
Epic: `EP-002`. Status: `Done`.
Triage: `ready-for-agent`.

### User value
Разработчик и ИИ-агент не могут случайно закоммитить код с ошибками ESLint или сломанный меморибанк: быстрые проверки идут на каждом коммите. Изменённые файлы `src/` форматируются Prettier автоматически. Раньше хук не срабатывал: в `package.json` был конфиг в формате Husky 4 при установленном Husky 8, папки `.husky/` не было.

### Deliverables
- Husky 9: `.husky/pre-commit`, скрипт `prepare: "husky"`, из `package.json` убран устаревший блок `husky.hooks`.
- lint-staged: `.lintstagedrc` — Prettier только для staged `src/**/*.{ts,tsx}`, чтобы не переформатировать меморибанк и прочие файлы. Существующий `.prettierrc` и Prettier 2 сохранены.
- Хук: `npx lint-staged`, `npm run lint`, `npm run docs:check`.

### Context (SSoT links)
- [EP-002](../epics/EP-002-automated-tests.md): место фичи в эпике и связь с FT-0006 (`npm test` в хуке). Читать, чтобы понимать очередь EP-002.
- [Stack & tooling](../../spec/project/stack-and-tooling.md): как устроен pre-commit. Читать при изменении хука.

### Implementation plan
- `npm install -D husky@^9 lint-staged --legacy-peer-deps`, `npx husky init` (ставит `core.hooksPath = .husky/_`).
- `npm test` в хук не добавляется: скрипта пока нет (FT-0006).
- `lint-staged` закреплён на `^16`: v17 требует Node ≥ 22.22.1, а проект объявляет `>=22.0.0`.
- Отступления от скилла `/setup-pre-commit`: Prettier 2 и `.prettierrc` сохранены; lint-staged ограничен `src/**/*.{ts,tsx}`; скриптов `typecheck` и `test` нет, вместо них `lint` и `docs:check`.

### Scenarios (acceptance)
#### Setup
- Свежий clone, `npm ci --legacy-peer-deps` (скрипт `prepare` устанавливает хук).
- Actors: разработчик или ИИ-агент.

#### Action
- Закоммитить изменение в `src/**/*.ts`, затем — изменение с ошибкой ESLint в `src/`.

#### Assert
- Первый коммит проходит; lint-staged прогоняет Prettier только по staged-файлам `src/`, файлы меморибанка не меняются.
- Второй коммит отклоняется хуком (ненулевой exit code `npm run lint`), изменения остаются в индексе. `npm run lint` проверяет весь `src/`, поэтому коммит отклоняется и при ошибке в unstaged-файле.

### Tests
- Автотестов нет: это инфраструктура, проверяется сценарием выше.

### Definition of done
По [Feature template](../../mbb/templates/feature.md) — общий DoD фичи; читать, чтобы закрыть фичу по чеклисту.

### Docs updates (SSoT)
- [Stack & tooling](../../spec/project/stack-and-tooling.md) — раздел о pre-commit.
- [Coding style](../../spec/engineering/coding-style.md) — ESLint запускается хуком.
