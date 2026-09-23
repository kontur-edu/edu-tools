# How we plan epics & features
Status: Draft (2026-09-23)

Цель: чтобы план был пригоден для исполнения и проверки, а не списком хотелок.

## Units
- **Epic** (`EP-XXX`): крупная тема, объединяющая фичи. Файл — `plans/epics/EP-XXX-<name>.md` по [Epic template](../mbb/templates/epic.md).
- **Feature** (`FT-XXXX`): минимально полезная поставка (вертикальный слайс), которую можно проверить. Пока фича не в работе, она живёт одной строкой в эпике. Когда берётся в работу — заводится файл `plans/features/FT-XXXX-<name>.md` по [Feature template](../mbb/templates/feature.md), и эпик ссылается на него.
- ID сквозные по проекту и не переиспользуются.

## Правила, которые здесь не повторяются
- Definition of Done фичи и формат сценариев приёмки — в [Feature template](../mbb/templates/feature.md) (SSoT).
- Теги коммитов `[FT-XXXX]` / `[EP-XXX]` — в [MBB principles](../mbb/principles.md), п. 9.
- Какие слои входят в слайс в этом проекте — в [Layers & vertical slices](../spec/project/layers-and-vertical-slices.md).

## Порядок работы
1. Эпик и его место в очереди фиксируются в [Roadmap](roadmap.md).
2. Фича берётся в работу → создаётся FT-документ → реализация по [Implementation playbook](implementation-playbook.md).
3. После завершения: статус фичи в FT-документе и в эпике, строка в [Verification matrix](verification-matrix.md), обновления `spec/*` и `adr/*`.
