# edu-tools — AGENTS.md
Status: Draft (2026-03-03)

## System summary (C4 L1)
TODO составить краткое описание

Акторы: TODO

Внешние системы: TODO

## Memory bank (SSoT)
Меморибанк находится в `.memory-bank/` и является SSoT по требованиям/решениям/планам.

Ссылки (аннотированные):
- [`.memory-bank/index.md`](.memory-bank/index.md) — главный индекс меморибанка (куда идти за spec/plans/adr/mbb). Читать, чтобы быстро найти SSoT по теме и не создавать orphan документы.
- [`.memory-bank/mbb/index.md`](.memory-bank/mbb/index.md) — “библия” меморибанка: правила SSOT/аннотированных ссылок/duo pattern/индексов. Читать перед созданием новых документов, чтобы соблюдать стандарты и не плодить дубли.
- [`.memory-bank/structure.md`](.memory-bank/structure.md) — структура репозитория по папкам (apps/packages) и границы слоёв. Читать, чтобы правильно раскладывать код и не тащить бизнес-логику в UI/CLI.
- [`.memory-bank/spec/index.md`](.memory-bank/spec/index.md) — спецификации (WHAT). Читать, чтобы реализовывать правила домена и интеграции корректно.
- [`.memory-bank/adr/index.md`](.memory-bank/adr/index.md) — ADR (WHY). Читать, чтобы не отменять решения случайно и понимать компромиссы.
- [`.memory-bank/plans/index.md`](.memory-bank/plans/index.md) — планы эпиков/фич + сценарии. Читать, чтобы делать работу вертикальными слайсами с автопроверками.
