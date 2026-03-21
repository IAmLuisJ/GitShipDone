# Project Build Log

`Current Status`
=================
**Last Updated:** 2026-03-21
**Tasks Completed:** 22
**Current Task:** TASK-22 Complete

----------------------------------------------

## Session Log

### 2026-03-21 — TASK-22: GET /api/auth/google — initiate Google OAuth flow
- Installed `passport` and `passport-google-oauth20` with type definitions
- Created `server/src/config/passport.ts` with GoogleStrategy configuration
  - Find-or-create user by google_id or email
  - Updates google_id on existing email-matched users
  - Creates new OAuth-only users with no password_hash
- Added `GET /api/auth/google` route — redirects to Google consent screen
- Added `GET /api/auth/google/callback` — handles callback, issues tokens, redirects to frontend
  - On success: redirects to `FRONTEND_URL/auth/callback?token=ACCESS_TOKEN`
  - On failure: redirects to `FRONTEND_URL/login?error=oauth_failed`
  - Sets HttpOnly refresh token cookie and stores hashed token in DB
- Initialized passport in `app.ts` with `passport.initialize()` middleware
- 6 unit tests covering route registration, failure redirect, success redirect, cookie setting, token storage
- 227 total unit tests passing, type checks clean

## Session Log

### 2026-03-21 — TASK-21: POST /api/auth/reset-password — apply new password
- Added `resetPasswordSchema` validator (token + newPassword min 8 chars)
- Added `POST /api/auth/reset-password` endpoint to `server/src/routes/auth.ts`
- Finds unused, non-expired password_reset_tokens and bcrypt-compares to find match
- Returns 400 for invalid/expired tokens and short passwords
- Updates user's password_hash with bcrypt cost 12
- Marks reset token as used (sets used_at), preventing reuse
- Deletes all refresh tokens for user (forces re-login on all sessions)
- 9 unit tests covering all acceptance criteria
- 221 total unit tests passing, type checks clean

### 2026-03-21 — TASK-20: POST /api/auth/forgot-password — send reset email
- Created `password_reset_tokens` table schema and migration (0012)
- Created `server/src/services/email.ts` with Resend integration + dev console stub
- Added `POST /api/auth/forgot-password` endpoint to `server/src/routes/auth.ts`
- Always returns 200 with generic message (prevents email enumeration)
- Generates crypto.randomBytes(32) token, stores bcrypt hash, expires in 1 hour
- Sends reset email via email service; gracefully handles email failures
- Skips token generation for non-existent or soft-deleted users
- 9 unit tests for forgot-password, 10 for password_reset_tokens schema
- 212 total unit tests passing, type checks clean

### 2026-03-21 — TASK-19: POST /api/auth/logout — invalidate refresh token
- Added `POST /api/auth/logout` endpoint to `server/src/routes/auth.ts`
- Reads refresh token cookie, verifies JWT, finds matching hashed token in DB and deletes it
- Gracefully handles missing/invalid/expired tokens — always returns 200 (idempotent)
- Clears HttpOnly refreshToken cookie on every logout call
- 6 unit tests covering all acceptance criteria
- 193 total unit tests passing, type checks clean

### 2026-03-21 — TASK-18: POST /api/auth/refresh — refresh access token
- Added `POST /api/auth/refresh` endpoint to `server/src/routes/auth.ts`
- Reads refresh token from HttpOnly cookie, verifies JWT, checks user exists
- Finds matching hashed token in DB (bcrypt compare), deletes old token (rotation)
- Issues new access + refresh tokens, sets new HttpOnly cookie
- Returns 401 for missing/invalid/expired tokens, deleted users, non-matching hashes
- 8 unit tests covering all acceptance criteria

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

### 2026-03-21 — TASK-10: Points log table schema and migration
- Created `server/src/db/schema/pointsLog.ts` with all required columns
- Defined `pointSourceEnum` with 6 sources (todo, milestone, journal, github_commit, github_release, manual)
- FK to `projects.id` with cascade delete, index on `project_id`
- `delta` as integer (positive or negative), `reason` as varchar(255)
- Exported `PointsLog` and `NewPointsLog` types, added to schema barrel
- Hand-wrote migration SQL `0006_create_points_log.sql`
- Migration runs successfully, table verified in PostgreSQL
- 95 unit tests passing (11 new for points log schema), type checks clean

### 2026-03-21 — TASK-11: Parking lot items table schema and migration
- Created `server/src/db/schema/parkingLotItems.ts` with all required columns
- FK to `projects.id` with cascade delete, index on `project_id`
- `title` as varchar(500) notNull, `description` as nullable text
- `ai_pathway` as nullable text for AI-generated step-by-step plans
- `archived_at` as nullable timestamp for soft archiving
- Exported `ParkingLotItem` and `NewParkingLotItem` types, added to schema barrel
- Hand-wrote migration SQL `0007_create_parking_lot_items.sql`
- Migration runs successfully, table verified in PostgreSQL
- 107 unit tests passing (12 new for parking lot items schema), type checks clean

### 2026-03-21 — TASK-12: GitHub commits table schema and migration
- Created `server/src/db/schema/githubCommits.ts` with all required columns
- FK to `projects.id` with cascade delete
- `sha` varchar(40) with UNIQUE constraint for idempotent imports
- `author_email` nullable, all other fields notNull
- Indexes on `project_id` and `committed_at` for timeline sorting
- Exported `GithubCommit` and `NewGithubCommit` types, added to schema barrel
- Hand-wrote migration SQL `0008_create_github_commits.sql`
- Migration runs successfully, table verified in PostgreSQL
- 120 unit tests passing (13 new for github commits schema), type checks clean

### 2026-03-21 — TASK-13: GitHub releases table schema and migration
- Created `server/src/db/schema/githubReleases.ts` with all required columns
- FK to `projects.id` with cascade delete
- `tag_name` varchar(255) notNull, `name` varchar(255) nullable
- `body` nullable text for raw GitHub release notes, `ai_summary` nullable text for AI-generated summary
- `published_at` timestamp notNull, `url` text notNull
- Composite index on `(project_id, published_at DESC)` for timeline ordering
- Exported `GithubRelease` and `NewGithubRelease` types, added to schema barrel
- Hand-wrote migration SQL `0009_create_github_releases.sql`
- Migration runs successfully, table verified in PostgreSQL
- 133 unit tests passing (13 new for github releases schema), type checks clean

### 2026-03-21 — TASK-14: Notifications table schema and migration
- Created `server/src/db/schema/notifications.ts` with all required columns
- Defined `notificationTypeEnum` with 4 types (milestone_due, todo_due, milestone_completed, system)
- FK to `users.id` with cascade delete, optional FK to `projects.id` with set null on delete
- `is_read` boolean (default false), `snoozed_until` nullable timestamp
- Indexes on `user_id` and `(user_id, is_read)` for notification bell queries
- Exported `Notification` and `NewNotification` types, added to schema barrel
- Hand-wrote migration SQL `0010_create_notifications.sql`
- Migration runs successfully, table verified in PostgreSQL
- 146 unit tests passing (13 new for notifications schema), type checks clean

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

### 2026-03-21 — TASK-16: POST /api/auth/register — email/password registration
- Installed bcryptjs, jsonwebtoken, zod, cookie-parser in server/
- Created `server/src/utils/jwt.ts` with signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken
- Created `server/src/validators/auth.ts` with Zod registerSchema
- Created `server/src/routes/auth.ts` with POST /register handler
  - Validates input with Zod, checks duplicate email (409), hashes password with bcrypt(12)
  - Creates user, signs JWT access + refresh tokens, stores hashed refresh token in DB
  - Sets HttpOnly cookie for refresh token, returns 201 with user + accessToken
- Added cookie-parser middleware and auth router to app.ts, enabled CORS credentials
- 170 unit tests passing (15 new: 7 JWT, 8 auth-register), type checks clean

### 2026-03-21 — TASK-15: Refresh tokens table schema and migration
- Created `server/src/db/schema/refreshTokens.ts` with all required columns
- FK to `users.id` with cascade delete, index on `user_id`
- `token_hash` as text notNull (bcrypt hash, never plaintext)
- `expires_at` as timestamp notNull for token expiry
- Exported `RefreshToken` and `NewRefreshToken` types, added to schema barrel
- Hand-wrote migration SQL `0011_create_refresh_tokens.sql`
- Migration runs successfully, table verified in PostgreSQL
- 155 unit tests passing (9 new for refresh tokens schema), type checks clean

### 2026-03-21 — TASK-17: POST /api/auth/login — email/password login
- Added `loginSchema` to `server/src/validators/auth.ts`
- Implemented `POST /api/auth/login` in `server/src/routes/auth.ts`
  - Validates body with Zod, returns generic 401 for all auth failures (prevents user enumeration)
  - Rejects soft-deleted users and OAuth-only accounts (no password hash)
  - Verifies password with bcrypt.compare, signs new JWT access + refresh tokens
  - Deletes old refresh tokens for the user, stores new hashed refresh token
  - Sets HttpOnly cookie for refresh token, returns 200 with user + accessToken
- 179 unit tests passing (9 new for auth-login), type checks clean
