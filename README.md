# EduTools

Инструменты для автоматизации рутинных операций в системах УрФУ: БРС, ИТС, TeamProject, Partner. Задание описывается на листе Google Таблицы, а web-приложение выполняет его от имени пользователя. Сначала можно сделать пробный прогон без изменений (try), затем — прогон с записью (save).

Web-приложение: https://edu-tools.fiit-urfu-cloud.ru

## Запуск
Нужен Node.js 22+ (см. `.nvmrc`).

```bash
npm ci --legacy-peer-deps   # установка по package-lock.json (флаг обязателен, см. ниже)
npm run web-start   # web-приложение в режиме разработки
npm run lint        # ESLint
npm run docs:check  # проверка меморибанка
```

`--legacy-peer-deps` нужен при любой установке и добавлении пакетов (`npm install <pkg> --legacy-peer-deps`): `react-scripts` 5 объявляет peer-зависимость на TypeScript 4, а в проекте TypeScript 5, и без флага npm завершается ошибкой `ERESOLVE`.

Остальные команды (бот, Node-скрипты, деплой) и настройка `.env` / `secrets/` описаны в [stack & tooling](.memory-bank/spec/project/stack-and-tooling.md).

## Документация
Вся документация находится в меморибанке [`.memory-bank/`](.memory-bank/index.md): спецификации, архитектура, решения (ADR) и планы. Правила для ИИ-агентов — в [AGENTS.md](AGENTS.md).

## Структура
- `src/` — web-приложение, Telegram bot и общий код заданий;
- `cors-proxy/` — CORS-proxy для обращения браузера к системам УрФУ;
- `brs-extensions/` — старое приложение для переноса баллов в БРС. Хранится как образец для переноса функциональности, не развивается.
