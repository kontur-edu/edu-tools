# C4 L2 — Containers
Status: Draft (2026-09-24)

## Containers
- **Web SPA** (React, статика в Object Storage, `edu-tools.fiit-urfu-cloud.ru`). Содержит весь движок заданий и API-клиенты; выполняется целиком в браузере. Учётные данные внешних систем хранит в `localStorage`/`sessionStorage`. К Google обращается напрямую, к системам УрФУ — через CORS-proxy.
- **CORS-proxy** (Node, `cors-anywhere`, Docker → Yandex Serverless Container). Проксирует запросы браузера к системам УрФУ и добавляет CORS-заголовки.
- **Telegram bot** (Node, Telegraf, Yandex Cloud Function `fiit-tools-bot`, webhook; локально — long polling). Пишет в Notion. В перспективе заменяется web-приложением или PWA.
- **CLI и Node scripts** (`src/cli/`, `src/legacyScripts.ts`, запуск разработчиком или ИИ-агентом). Используют тот же движок заданий и API-клиенты, что и web, но без CORS-proxy и с Google OAuth installed-app flow (токены в `secrets/`).
- **brs-extensions** (отдельное React-приложение, GitHub Pages) — не часть edu-tools, а референс для переноса функциональности (перенос баллов из Google Таблиц в БРС через тот же CORS-proxy). Не развивается.

## Key constraints
- Нет собственного бэкенда и БД: состояние — только в Google Таблицах, во внешних системах и в browser storage пользователя.
- Код `src/tasks`, `src/actions`, `src/apis` должен работать и в браузере, и в Node: окружение-специфичное — только через абстракции (`GoogleApi`: `BrowserGoogleApi` / `NodeGoogleApi`; `*UrlProvider(withProxy)`: в браузере `true`, в Node `false`).
- Бот ограничен таймаутом облачной функции (120 с).

Ссылки (аннотированные):
- [CORS-proxy](../integrations/cors-proxy.md): зачем нужен прокси и как через него передаются куки и авторизация. Читать при добавлении новой интеграции с системой УрФУ.
- [L3 — Components](l3-components.md): устройство Web SPA / общего кода. Читать, чтобы класть код в правильный компонент.
