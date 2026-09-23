# Stack & tooling
Status: Draft (2026-09-23)

Зафиксированный стек:
- **Язык:** TypeScript (strict), ESM (`"type": "module"`), Node.js ≥ 22 (`.nvmrc`). Функция бота в Yandex Cloud пока работает на runtime `nodejs18`; переход на последние версии Node — в перспективе roadmap (не сейчас, есть риск поломок).
- **Web:** React 18 + MUI + Emotion, React Router, Zustand (состояние авторизаций), Create React App (`react-scripts`).
- **Google:** в браузере — `@react-oauth/google` (OAuth token) + `gapi` (Sheets API v4); в Node — `googleapis` / `google-auth-library` (OAuth installed-app flow).
- **Telegram bot:** Telegraf; HTML из Telegram-сущностей → Markdown → блоки Notion (`hast-util-*`, `mdast-util-to-markdown`, `@tryfabric/martian`).
- **Notion:** `@notionhq/client`.
- **CORS-proxy:** форк `cors-anywhere` (Node, Docker).
- **CLI (target, EP-001):** Commander; задания из Google Таблиц или CSV.
- **brs-extensions** (референс, не развивается): React 17, MUI v4, CRA 4, GitHub Pages.
- **Хостинг:** Yandex Cloud — Object Storage (статика web), Cloud Functions (бот), Serverless Containers (CORS-proxy).

Инструменты и практики:
- Сборка Node-части: `tsc` в `build/`; запуск через `node --loader ./loader.js` (loader дописывает `.js` к относительным импортам).
- Сборка web: `react-scripts build`.
- Lint: ESLint (`@typescript-eslint/recommended`) на `src/`. Pre-commit через Husky задуман (`npm run lint`), но сейчас не срабатывает: конфиг в формате Husky 4 при установленном Husky 8 (исправляется в FT-0017).
- Форматирование: Prettier — без `;`, одинарные кавычки, trailing commas, ширина 120, отступ 2.
- Автотестов нет (`web-test` из CRA не используется).
- Dev-окружение: GitHub Codespaces (`.devcontainer/`) с Claude Code.

## Команды
| Команда | Что делает |
|---|---|
| `npm run web-start` | dev-сервер web-приложения |
| `npm run web-build` | production-сборка web в `build/` |
| `./web-deploy.sh` | сборка web + `s3cmd sync` в бакет `EDU_TOOLS_WEB_BUCKET` |
| `npm run dev` | nodemon + ts-node для `src/main.ts` |
| `npm run build` / `npm start` | компиляция и запуск `build/main` |
| `npm run bot-dev` / `npm run bot-start` | бот локально (long polling) |
| `./bot-deploy.sh` | сборка, выкладка функции `fiit-tools-bot` в Yandex Cloud, регистрация webhook |
| `npm run lint` / `npm run format` | ESLint / ESLint --fix |
| `npm run docs:check` | проверка меморибанка: битые ссылки, документы без входящих ссылок, строка статуса |
| `cors-proxy/deploy.sh` | docker build/push + деплой ревизии serverless-контейнера |

## Конфигурация и секреты
- `.env` (образец `.env.sample`): `TELEGRAM_TOKEN`, `TELEGRAM_URL`, `NOTION_TOKEN`, `NOTION_RESOURCES_DB`, `EDU_TOOLS_WEB_BUCKET`.
- `secrets/` (в `.gitignore`, образец `secrets.sample/`): `google.json` (OAuth client для Node), `google-tokens.json` (сохранённые токены), `brs.json`.
- Константы в коде: адрес CORS-proxy (`src/helpers/CorsProxyUrlProvider.ts`), Google Client ID для web (`src/components/GoogleAuth/GoogleAuthProvider.tsx`).
