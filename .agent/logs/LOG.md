# Project Build Log

`Current Status`
=================
**Last Updated:** 2026-03-20
**Tasks Completed:** 8
**Current Task:** TASK-8 Complete

----------------------------------------------

## Session Log

### 2026-03-20 — TASK-1: Docker Compose setup with PostgreSQL
- Created `docker-compose.yml` with PostgreSQL 15 Alpine, healthcheck, named volume
- Created `.env.example` with all required environment variables
- Updated `.gitignore` to exclude `.env` and `*.js.map`
- Added `db:up`, `db:down`, `db:reset` npm scripts to `package.json`
- Verified PostgreSQL starts and is accessible
- Fixed sandbox native binaries (esbuild, rollup, rolldown, lightningcss)
- Downgraded Vite 8→7 due to Rolldown SIGILL on ARM emulation
- Screenshot: `.agent/screenshots/initial-setup.png`

### 2026-03-20 — TASK-2: Initialize Express.js + TypeScript backend
- Created `server/` directory with its own `package.json` and `tsconfig.json`
- Set up Express.js with TypeScript: `app.ts` (app config) and `index.ts` (entry point)
- Added health check route at `GET /api/health` returning `{ status, timestamp }`
- Added global error handler with `AppError` class, returns JSON (not HTML)
- Configured morgan logging, CORS, Helmet, express.json middleware
- Added vitest + supertest for unit testing, 2 tests passing
- Updated `.env.example` PORT to 3001 (Vite uses 3000)
- Fixed corrupted `@vitest/spy` null-byte issue from `--ignore-scripts`

### 2026-03-20 — TASK-3: Configure Drizzle ORM with PostgreSQL connection
- Installed `drizzle-orm`, `pg`, `drizzle-kit`, `@types/pg` in server/
- Created `server/src/db/index.ts` with Pool + Drizzle client, exports `db` and `pool`
- Created `server/src/db/schema/index.ts` as empty barrel for future table definitions
- Created `server/drizzle.config.ts` with PostgreSQL dialect config
- Added `db:generate`, `db:migrate`, `db:push`, `db:studio` scripts to server/package.json
- Used programmatic migrator (`src/db/migrate.ts`) instead of drizzle-kit CLI (Go binary crashes on ARM emulation)
- Added DB connection verification on server startup via `pool.query('SELECT 1')`
- Switched docker-compose to tmpfs volume (named volumes not shared on this host)
- Fixed corrupted drizzle-kit binary via npm pack
- 4 unit tests passing, type checks clean

### 2026-03-20 — TASK-4: Users table schema and migration
- Created `server/src/db/schema/users.ts` with all required columns (uuid PK, email, name, OAuth fields, AI settings, soft delete)
- Email has UNIQUE constraint; github_id and google_id also unique
- Indexes on email and created_at
- All nullable fields correctly typed (passwordHash, avatarUrl, OAuth tokens, AI fields, deletedAt)
- Exported User and NewUser types
- Exported from schema barrel `index.ts`
- Hand-wrote migration SQL (drizzle-kit Go binary crashes on ARM emulation)
- Migration runs successfully, table verified in PostgreSQL
- 14 unit tests passing, type checks clean

### 2026-03-20 — TASK-5: Projects table schema and migration
- Created `server/src/db/schema/projects.ts` with all required columns
- Defined `projectTypeEnum` (software, design, physical, content, learning, other) and `projectStatusEnum` (active, on_hold, completed, archived) as Drizzle pgEnums
- FK to `users.id` with cascade delete, UNIQUE constraint on `share_token`
- Indexes on `user_id` and `share_token`
- Exported `Project` and `NewProject` types, added to schema barrel
- Hand-wrote migration SQL `0001_create_projects.sql` (drizzle-kit Go binary crashes on ARM)
- Migration runs successfully, table verified in PostgreSQL
- 33 unit tests passing (18 new for projects schema), type checks clean

### 2026-03-20 — TASK-6: Milestones table schema and migration
- Created `server/src/db/schema/milestones.ts` with all required columns
- Defined `milestoneStatusEnum` (pending, in_progress, completed) as Drizzle pgEnum
- FK to `projects.id` with cascade delete, index on `project_id`
- `sort_order` integer (default 0) for drag-and-drop reordering
- `due_date` as nullable date, `completed_at` as nullable timestamp
- Exported `Milestone` and `NewMilestone` types, added to schema barrel
- Hand-wrote migration SQL `0002_create_milestones.sql`
- Migration runs successfully, table verified in PostgreSQL
- Fixed server esbuild binary (SIGILL on ARM emulation)
- 47 unit tests passing (14 new for milestones schema), type checks clean

### 2026-03-20 — TASK-7: Todos table schema and migration
- Created `server/src/db/schema/todos.ts` with all required columns
- FK to `projects.id` with cascade delete, optional FK to `milestones.id` with set null on delete
- `is_completed` and `is_urgent` boolean fields (default false)
- `sort_order` integer (default 0), `due_date` nullable date, `completed_at` nullable timestamp
- Composite index on `(project_id, is_completed)` for progress calculation queries
- Exported `Todo` and `NewTodo` types, added to schema barrel
- Hand-wrote migration SQL `0003_create_todos.sql`
- Migration runs successfully, table verified in PostgreSQL
- 61 unit tests passing (14 new for todos schema), type checks clean

### 2026-03-20 — TASK-8: Journal entries table schema and migration
- Created `server/src/db/schema/journalEntries.ts` with all required columns
- Defined `journalMoodEnum` (excited, blocked, steady, win, learning) as Drizzle pgEnum
- FK to `projects.id` with cascade delete, index on `project_id`
- `body` as TEXT for Tiptap JSON serialized content
- Soft delete via nullable `deleted_at` timestamp
- Exported `JournalEntry` and `NewJournalEntry` types, added to schema barrel
- Hand-wrote migration SQL `0004_create_journal_entries.sql`
- Migration runs successfully, table verified in PostgreSQL
- 73 unit tests passing (12 new for journal entries schema), type checks clean

### 2026-03-21 — TASK-9: Timeline events table schema and migration
- Created `server/src/db/schema/timelineEvents.ts` with all required columns
- Defined `timelineEventTypeEnum` with all 8 event types (journal, milestone_completed, todo_batch, github_commit, github_release, progress_change, points_change, status_change)
- FK to `projects.id` with cascade delete
- `payload` JSONB column (notNull, default `{}`) for event-specific data
- `ref_id` nullable UUID for linking to source records
- Composite index on `(project_id, created_at DESC)` for paginated timeline queries
- Index on `type` for filtering
- Hand-wrote migration SQL `0005_create_timeline_events.sql`
- Migration runs successfully, table verified in PostgreSQL
- 84 unit tests passing (11 new for timeline events schema), type checks clean
