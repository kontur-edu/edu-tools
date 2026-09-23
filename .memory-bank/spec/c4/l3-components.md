# C4 L3 — Components
Status: Draft (2026-09-23)

Компоненты Web SPA и общего кода (`src/`).

## Components
- **UI** (`src/components/`): главная страница (форма ссылки на лист, кнопки «Попробовать сделать хорошо» = try и «Сделать хорошо» = save, диалог с логом выполнения), переключатели и диалоги входа для каждой системы, страница политики конфиденциальности (`/privacy`).
- **Auth stores** (`src/stores/`): по одному Zustand-стору на систему (Google, БРС, ИТС, TeamProject, Partner). Вход = проверка учётных данных пробным запросом; кэширование в browser storage; восстановление при перезагрузке; фабрика API-клиента `getApi()`.
- **Task engine** (`src/tasks/`): чтение листа в `TableTask` (`TableTaskReader`), запись в лист (`TableTaskWriter`), маршрутизация по имени задания (`CompositeTableTaskExecutor`), исполнители заданий, события выполнения (`TaskReporter`, `TaskEvents`, текстовый рендер `TaskEventText`), идентификация проектов TeamProject (`WorkspaceInfo`).
- **Table sources** (target, EP-001): CSV codec, разбор задания по сетке значений, источники (Google / CSV / in-memory), конвертер Google ⇄ CSV. Сейчас чтение листа встроено в `TableTaskReader`. См. [Table sources](../domain/table-sources.md).
- **Actions** (`src/actions/`): многошаговые операции, переиспользуемые заданиями и скриптами (заполнение техкарты, перенос баллов в БРС).
- **API clients** (`src/apis/`): для каждой системы — `*Api` (операции), `*Auth` (учётные данные), `*UrlProvider` (базовый URL ± прокси); `GoogleApi` — интерфейс с браузерной и Node-реализациями.

## Dependency direction
`components → stores → apis`; `components → tasks → actions → apis`.
Задания получают API-клиенты через функции-геттеры, переданные в `CompositeTableTaskExecutor`, и не знают о сторах и React. Если нужной авторизации нет — задание не запускается, в лог пишется, в какую систему нужно войти.

Ссылки (аннотированные):
- [Table task format](../domain/table-task-format.md): контракт между таблицей и движком заданий. Читать перед изменением `TableTaskReader` или добавлением нового задания.
- [Task catalog](../domain/tasks/index.md): поведение каждого исполнителя. Читать перед изменением исполнителя.
