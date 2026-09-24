# Stack & tooling
Status: Draft (2026-09-24)

Зафиксированный стек:
- **Язык:** TypeScript (strict), ESM (`"type": "module"`), Node.js ≥ 22 (`.nvmrc`). Функция бота в Yandex Cloud пока работает на runtime `nodejs18`; переход на последние версии Node — в перспективе roadmap (не сейчас, есть риск поломок).
- **Web:** React 18 + MUI + Emotion, React Router, Zustand (состояние авторизаций), Create React App (`react-scripts`).
- **Google:** в браузере — `@react-oauth/google` (OAuth token) + `gapi` (Sheets API v4); в Node — `googleapis` / `google-auth-library` (OAuth installed-app flow).
- **Telegram bot:** Telegraf; HTML из Telegram-сущностей → Markdown → блоки Notion (`hast-util-*`, `mdast-util-to-markdown`, `@tryfabric/martian`).
- **Notion:** `@notionhq/client`.
- **CORS-proxy:** форк `cors-anywhere` (Node, Docker).
- **CLI:** Commander (`src/cli/`, [CLI spec](../cli/cli.md)); сейчас — `auth check`, `google login`; задания из Google Таблиц или CSV — в EP-001.
- **brs-extensions** (референс, не развивается): React 17, MUI v4, CRA 4, GitHub Pages.
- **Хостинг:** Yandex Cloud — Object Storage (статика web), Cloud Functions (бот), Serverless Containers (CORS-proxy).

Инструменты и практики:
- Установка зависимостей: `npm ci --legacy-peer-deps` (добавление пакета — `npm install <pkg> --legacy-peer-deps`). Флаг обязателен: `react-scripts` 5 объявляет peer-зависимость `typescript@^3 || ^4`, а в проекте TypeScript 5, без флага npm падает с `ERESOLVE`. На сборку и dev-сервер это не влияет.
- Сборка Node-части: `tsc` в `build/`; запуск через `node --loader ./loader.js` (loader дописывает `.js` к относительным импортам).
- Сборка web: `react-scripts build`.
- Lint: ESLint (`@typescript-eslint/recommended`) на `src/`. Pre-commit через Husky задуман (`npm run lint`), но сейчас не срабатывает: конфиг в формате Husky 4 при установленном Husky 8 (исправляется в FT-0017).
- Форматирование: Prettier — без `;`, одинарные кавычки, trailing commas, ширина 120, отступ 2.
- Автотестов нет (`web-test` из CRA не используется).
- Playwright (`@playwright/test`) установлен как dev-зависимость для управления web-приложением из headless-браузера; тестов на нём пока нет (e2e web UI — out of scope EP-002). Браузер — установленный Chrome через `channel: 'chrome'`: скачивание сборки `npx playwright install chromium` с `cdn.playwright.dev` может обрываться по таймауту.
- Dev-окружение: GitHub Codespaces (`.devcontainer/`) с Claude Code.

## Команды
| Команда | Что делает |
|---|---|
| `npm ci --legacy-peer-deps` | установка зависимостей по `package-lock.json` |
| `npm run web-start` | dev-сервер web-приложения |
| `npm run web-build` | production-сборка web в `build/` |
| `./web-deploy.sh` | сборка web + `s3cmd sync` в бакет `EDU_TOOLS_WEB_BUCKET` |
| `npm run build` | компиляция Node-части (`tsc`) в `build/` |
| `npm run -s cli -- <команда>` | сборка и запуск CLI (`build/cli/main`); `-s` — чтобы при `--json` в stdout был только JSON |
| `npm run legacy-scripts` / `npm run dev` | сборка и запуск разовых скриптов `src/legacyScripts.ts` / то же через nodemon + ts-node |
| `npm run bot-dev` / `npm run bot-start` | бот локально (long polling) |
| `./bot-deploy.sh` | сборка, выкладка функции `fiit-tools-bot` в Yandex Cloud, регистрация webhook |
| `npm run lint` / `npm run format` | ESLint / ESLint --fix |
| `npm run docs:check` | проверка меморибанка: битые ссылки, документы без входящих ссылок, строка статуса |
| `cors-proxy/deploy.sh` | docker build/push + деплой ревизии serverless-контейнера |

## Конфигурация и секреты
- `.env` (образец `.env.sample`): `TELEGRAM_TOKEN`, `TELEGRAM_URL`, `NOTION_TOKEN`, `NOTION_RESOURCES_DB`, `EDU_TOOLS_WEB_BUCKET`.
- Учётные данные систем УрФУ для Node-кода читает только `NodeCredentials` (`src/apis/NodeCredentials.ts`, Node-only) из переменных окружения или `.env`:

  | Система | Переменная | Файл вместо значения |
  |---|---|---|
  | БРС | `BRS_SID` (JSESSIONID) | `BRS_SID_FILE`: текстовый файл с `sid` или `secrets/brs.json`, запись выбирается `BRS_USER`, а если запись одна, берётся она (у записи должно быть поле `sid`) |
  | ИТС | `ITS_AUTH` (cookie) | `ITS_AUTH_FILE` |
  | TeamProject | `TEAMPROJECT_JWT` (`Bearer …`) | `TEAMPROJECT_JWT_FILE` |
  | Partner | `PARTNER_COOKIE` (cookie или значение `key`) | `PARTNER_COOKIE_FILE` |

  Переменная со значением важнее файла. Если данных нет или файл неверный, бросается `CredentialsError` (`kind`: `missing` / `invalid`) с именем системы и переменных; значение секрета в сообщения не попадает.
- `secrets/` (в `.gitignore`, образец `secrets.sample/`): `google.json` (OAuth client для Node), `google-tokens.json` (сохранённые токены), `brs.json` (записи `{ "<имя>": { "sid" } | { "login", "password" } }`; из Node читается только `sid`).
- Константы в коде: адрес CORS-proxy (`src/helpers/CorsProxyUrlProvider.ts`), Google Client ID для web (`src/components/GoogleAuth/GoogleAuthProvider.tsx`).
