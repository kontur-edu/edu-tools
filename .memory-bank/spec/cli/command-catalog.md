# CLI command catalog (1:1 → Client API op)
Status: Draft (2026-03-03)

Цель: чтобы у каждой команды CLI была **ровно одна** операция typed client API, и чтобы сценарии GS* могли быть автоматизированы через CLI.

Формат записи:
- `command`: строка команды
- `op`: operation name (v1)
- `roles`: кто может вызвать (RBAC)
- `idempotency`: требуется ли `--idempotency-key`
