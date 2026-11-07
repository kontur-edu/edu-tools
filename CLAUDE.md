# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EduTools — full-stack educational management platform (Russian language) integrating BRS (grade system), ITS (team projects), Partner, Notion, and Google Sheets. Has three deployable artifacts: React web app, Telegram bot, and a CORS proxy.

## Commands

```bash
# Development
npm run dev                # Node backend with nodemon + ts-node watch mode
npm run bot-dev            # Telegram bot dev mode with auto-reload
npm run web-start          # React dev server (CRA)

# Build & Run
npm run build              # TypeScript compile (src → build)
npm run start              # Build + run main server
npm run bot-start          # Build + run Telegram bot
npm run web-build          # Production React build

# Code Quality
npm run lint               # ESLint on src/
npm run format             # ESLint auto-fix on src/
```

Pre-commit hook runs `npm run lint` via Husky.

Node version: v22 (see `.nvmrc`).

## Architecture

### Three Entry Points
- **Web app**: `src/index.tsx` → React SPA with MUI, deployed to S3
- **Server/CLI**: `src/main.ts` → Node backend
- **Telegram bot**: `src/bot.ts` → Telegraf webhook handler, deployed to Yandex Cloud Serverless Functions

### Core Pattern: Google Sheets-Driven Tasks
Google Sheets serve as declarative task definitions. The execution flow:
1. `TableTaskReader` (in `src/tasks/TableTask.ts`) parses a Google Sheet into `TableTask` objects
2. `CompositeTableTaskExecutor` routes each task to a specific executor by task type
3. Each executor (e.g., `CreateTechnologyCardsTask`, `DistributeStudentsIntoTeamsTask`) reads parameters from sheet rows, calls external APIs, and logs results
4. Tasks support "try mode" (dry run) vs. "save mode" (commits changes)

**Task types:** CreateTechnologyCards, DistributeStudentsIntoTeams, ExportTechnologyCards, CreateTeamProjectIterations, SendCuratorMarks.

### API Layer (`src/apis/`)
Each external system has a dedicated API client class: `BrsApi`, `ItsApiV2`, `TeamProjectApiV2`, `PartnerApi`, `NotionApi`, `NodeGoogleApi`/`BrowserGoogleApi`. URL configuration is handled by corresponding `*UrlProvider` classes. Shared domain types live in `apis/types.ts`.

### State Management (`src/stores/`)
Zustand stores per auth system (Google, BRS, ITS, TeamProject, Partner). Credentials are cached in browser storage with auto-recovery on reload.

### Subprojects
- `cors-proxy/` — standalone CORS proxy service (`cors-anywhere`), runs on port 81, has its own `package.json`
- `brs-extensions/` — browser extension for BRS system

## Code Style

Prettier: no semicolons, single quotes, trailing commas, 120 char width, 2-space indent.

## Environment Variables

See `.env.sample`: `TELEGRAM_TOKEN`, `TELEGRAM_URL`, `NOTION_TOKEN`, `NOTION_RESOURCES_DB`, `EDU_TOOLS_WEB_BUCKET`.
