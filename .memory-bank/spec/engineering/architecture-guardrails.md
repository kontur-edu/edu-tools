# Architecture guardrails
Status: Draft (2026-09-23)

## Guardrails (must, действуют сейчас)
1. `src/tasks`, `src/actions`, `src/apis` не импортируют React, `src/components` и `src/stores`. API-клиенты передаются в исполнители снаружи.
2. Код, общий для web и Node, не обращается к `window`, `localStorage`, `fs`, `process.stdin` напрямую. Окружение-специфичное — только в отдельных реализациях (`BrowserGoogleApi` / `NodeGoogleApi`, `BrowserCache` / `FileCache`, `NodeGoogleAuth`) и через `*UrlProvider(withProxy)`.
3. UI не содержит логики заданий: получает API-клиенты из сторов и вызывает `CompositeTableTaskExecutor`.
4. Любая запись во внешнюю систему выполняется только при `save`. Режим try не меняет данные ([ADR-0003](../../adr/ADR-0003-try-save-modes.md)).
5. Учётные данные внешних систем не хранятся нигде, кроме browser storage пользователя (web), `.env` и `secrets/` (Node). В коде и в git их нет ([ADR-0002](../../adr/ADR-0002-user-credentials-in-browser.md)).
6. Новое табличное задание регистрируется в `CompositeTableTaskExecutor` и описывается в [Task catalog](../domain/tasks/index.md).
7. `brs-extensions/` не изменяется: это референс для переноса функциональности.

## Guardrails (target, после EP-003)
- Core не выполняет I/O и не логирует: возвращает план изменений и результат.
- Use cases зависят от портов (интерфейсов), а не от конкретных `*Api`.
- Delivery (UI, CLI, bot) не содержит доменных правил: только ввод, вызов use case и отображение событий.

Ссылки (аннотированные):
- [Layers & vertical slices](../project/layers-and-vertical-slices.md): текущие и целевые слои. Читать, чтобы понимать, откуда берутся эти правила и куда они движутся.
