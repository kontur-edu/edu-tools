# Domain Docs

Как инженерные скиллы используют доменную документацию этого репозитория. Раскладка — single-context поверх меморибанка (`.memory-bank/`), который является SSoT. При противоречиях приоритет у MBB (`.memory-bank/mbb/`).

## Before exploring, read these

- **`.memory-bank/index.md`** — пройти по индексам до нужного раздела (спека задания, интеграция, эпик/фича).
- **`.memory-bank/spec/glossary.md`** — глоссарий проекта. Он играет роль `CONTEXT.md`, о котором говорят скиллы.
- **`.memory-bank/adr/`** — ADR, затрагивающие область работы; список с аннотациями — в `.memory-bank/adr/index.md`.

## Where skills write

- **Термины** (`/domain-modeling`, `/grill-with-docs` и др. «обновляют `CONTEXT.md`») → правка `.memory-bank/spec/glossary.md`.
- **ADR** → новый файл `.memory-bank/adr/ADR-XXXX-<kebab-name>.md` по шаблону `.memory-bank/mbb/templates/adr.md` (номер — следующий свободный) + аннотированная строка в `.memory-bank/adr/index.md`.
- **Не создавать** `CONTEXT.md`, `CONTEXT-MAP.md` и `docs/adr/` — это был бы второй SSoT.
- После правок меморибанка — `npm run docs:check`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `glossary.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0003 (try/save modes), but worth reopening because…_
