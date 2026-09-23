# Task catalog
Status: Draft (2026-09-23)

Поддерживаемые табличные задания (значение параметра `task`). Каждое задание сходится к желаемому состоянию: меняет только расхождения и безопасно для повторного запуска.

- [ExportTechnologyCards](export-technology-cards.md): выгрузка списка техкарт из БРС на лист (система: БРС + Google). Читать, чтобы подготовить входные данные для CreateTechnologyCards.
- [CreateTechnologyCards](create-technology-cards.md): заполнение и согласование техкарт в БРС по типовым правилам (система: БРС). Читать перед изменением правил заполнения техкарт.
- [DistributeStudentsIntoTeams](distribute-students-into-teams.md): запись студентов в команды проектов (система: ИТС). Читать, чтобы понимать сопоставление студентов, проектов и команд.
- [CreateTeamProjectIterations](create-team-project-iterations.md): создание и обновление итераций в рабочих пространствах проектов (система: TeamProject). Читать перед изменением логики итераций.
- [SendCuratorMarks](send-curator-marks.md): выставление оценок куратора за итерацию (система: TeamProject). Читать, чтобы понимать сопоставление студентов и проверки полноты.

Общие правила:
- [Workspace identification](workspace-identification.md): как строка таблицы сопоставляется с рабочим пространством TeamProject. Читать при работе с заданиями по TeamProject.
- [Execution events](execution-events.md): модель событий выполнения (статусы, scope, сводка) и их текстовый рендер. Читать перед добавлением или изменением сообщений лога.

Вне каталога (не подключено к web, запускается только из Node):
- Перенос баллов в БРС (`src/actions/putMarksToBrs*`, пример — `src/putMarks.sample.ts`). Логика частично перенесена из `brs-extensions/`; полный перенос в web — в перспективе roadmap.
- Клонирование паспортов проектов из Partner в Notion (`cloneProjects` в `src/main.ts`). Не развивается и не тестируется; может быть удалено или переписано с заменой Notion на BuildIn.AI.
