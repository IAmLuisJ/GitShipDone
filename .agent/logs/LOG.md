# Project Build Log

`Current Status`
=================
**Last Updated:** 2026-03-29
**Tasks Completed:** 76
**Current Task:** TASK-76 Complete

----------------------------------------------

## Session Log

### 2026-03-29 — TASK-76: AI context builder service — assemble project context for AI prompt injection
- Service already implemented in TASK-75 at `server/src/services/aiContextService.ts`
- `buildProjectContext(projectId)` fetches project, top 5 milestones, last 3 journal titles, open todo count
- Returns formatted string with name, type, vision (truncated 500 chars), status, progress%, level, points
- Uses `progressManual ?? progressAuto`, handles missing project, empty data gracefully
- 4 existing tests cover: all fields present, missing project, empty data, manual progress override
- All tests passing, type checks clean

### 2026-03-28 — TASK-75: POST /api/projects/:id/ai/chat — AI PM chat endpoint (multi-provider)
- Installed `openai` and `@anthropic-ai/sdk` SDKs
- Created `server/src/services/aiContextService.ts` — builds concise project context string (name, type, vision, status, progress, level, milestones, journal, todos)
- Created `server/src/routes/ai.ts` — POST `/chat` handler with multi-provider support (OpenAI gpt-4o / Anthropic claude-sonnet-4-6)
- Validates auth + project ownership, checks user has AI API key configured
- Decrypts API key, builds project context, calls appropriate AI provider
- Returns `{ response: string }` or 500 "AI service unavailable" on failure
- Mounted at `/api/projects/:id/ai` in app.ts
- 12 new tests: 4 context builder tests + 8 endpoint tests (401 no auth, 400 no key, 400 empty/missing message, 200 OpenAI, 200 Anthropic, 404 wrong project, 500 API failure)
- 694 total unit tests passing, type checks clean

### 2026-03-28 — TASK-74: DELETE /api/users/me — soft delete account
- Added DELETE `/me` endpoint to `server/src/routes/users.ts`
- Validates `{ confirmPassword: string }` with Zod
- Fetches user, verifies password via bcrypt.compare
- Returns 400 for OAuth-only accounts (no passwordHash)
- Returns 401 if password is incorrect
- Sets `deletedAt = NOW()` and `updatedAt = NOW()` on user record
- Deletes all refresh tokens for user (forces logout everywhere)
- Returns 200 `{ message: "Account deleted" }`
- 7 new tests: 401 no auth, 400 missing password, 404 soft-deleted, 400 OAuth account, 401 wrong password, 200 success (verifies soft delete + token cleanup), 400 empty string
- 682 total unit tests passing, type checks clean

### 2026-03-28 — TASK-72: PATCH /api/users/me/ai-settings — save AI provider and encrypted API key
- Added PATCH `/me/ai-settings` endpoint to `server/src/routes/users.ts`
- Validates `{ provider: 'openai' | 'anthropic', apiKey: string(10-500) }` with Zod
- Encrypts API key using AES-256-CBC (via `encrypt()` from encryption utility)
- Updates user record: `aiProvider` and `aiApiKey` (encrypted)
- Returns 200 `{ message: "AI settings saved", provider }`
- Returns 400 for invalid provider, missing fields, or short API key
- Returns 404 for soft-deleted users
- 9 new tests: 401 no auth, 400 invalid provider, 400 short key, 400 missing provider, 400 missing key, 200 openai, 200 anthropic, 404 soft-deleted, GET /me hasAiKey=true
- 675 total unit tests passing, type checks clean

## Session Log

### 2026-03-28 — TASK-71: PATCH /api/users/me/password — change password with current password verification
- Added PATCH `/me/password` endpoint to `server/src/routes/users.ts`
- Validates `{ currentPassword, newPassword }` with Zod (newPassword min 8 chars)
- Returns 400 for OAuth-only accounts (no passwordHash)
- Returns 401 if currentPassword doesn't match (bcrypt.compare)
- Hashes new password with bcrypt (cost 12), updates user record
- Invalidates all refresh tokens for the user (force re-login)
- 7 new tests: 401 no auth, 400 short password, 400 missing field, 400 OAuth account, 401 wrong password, 200 success, 404 soft-deleted
- 666 total unit tests passing, type checks clean

## Session Log

### 2026-03-28 — TASK-70: PATCH /api/users/me — update profile (name, avatar, email)
- Added PATCH `/me` endpoint to `server/src/routes/users.ts`
- Accepts partial updates: `name` (string 1-255) and `avatarUrl` (valid URL, max 2000)
- Returns 400 if `email` field is included (not supported in MVP)
- Returns 400 for invalid input or empty update body
- Updates `updatedAt` timestamp, returns sanitized profile (no sensitive fields)
- 7 new tests: 401 no auth, update name, update avatarUrl, reject email change, empty body, invalid URL, 404 soft-deleted
- 659 total unit tests passing, type checks clean

## Session Log

### 2026-03-28 — TASK-69: GET /api/users/me — get current user profile
- Created `server/src/routes/users.ts` with GET `/me` endpoint
- Returns sanitized profile: id, email, name, avatarUrl, aiProvider, hasAiKey (bool), emailNotificationsEnabled, githubConnected (bool), createdAt
- Never exposes passwordHash, aiApiKey, or githubAccessToken
- Returns 404 for soft-deleted users (deletedAt IS NOT NULL)
- Mounted at `/api/users` in app.ts (behind requireAuth middleware)
- Fixed requireAuth integration test that expected 404 for now-implemented route
- 6 unit tests: 401 no auth, 404 not found, 200 correct fields, no sensitive data, hasAiKey=false, githubConnected=false
- 652 total unit tests passing, type checks clean

## Session Log

### 2026-03-28 — TASK-67: Reminder cron job — send in-app and email reminders for upcoming milestones and todos
- Created `server/src/jobs/reminders.ts` with `runReminderCheck()` and `startReminderJob()`
- Daily cron at 8:00 AM UTC queries milestones (status != completed, due within 3 days) and urgent todos (incomplete, due within 3 days)
- Creates in-app notifications with deduplication (checks if same type+message already created today)
- Sends reminder emails via Resend when user has `emailNotificationsEnabled = true`
- Errors per-item are logged but do not stop processing of remaining items
- Wired `startReminderJob()` into `server/src/index.ts` after DB connection
- 12 unit tests: milestone/todo notification creation, email send/skip, deduplication, error resilience, cron scheduling
- 646 total unit tests passing, type checks clean

## Session Log

### 2026-03-28 — TASK-68: Email service setup with Resend — transactional email templates
- Installed `resend` SDK in server dependencies
- Refactored `server/src/services/email.ts` to use Resend SDK (`new Resend(apiKey)`) with console stub fallback
- Created `server/src/emails/passwordReset.ts` — HTML template with reset URL and unsubscribe link
- Created `server/src/emails/milestoneReminder.ts` — HTML template with milestone/project/due date and unsubscribe link
- Created `server/src/emails/todoReminder.ts` — HTML template with todo/project/due date and unsubscribe link
- All templates include CAN-SPAM compliant unsubscribe footer linking to `?tab=notifications`
- Updated `sendPasswordResetEmail` to use the new template
- 15 unit tests: service tests (stub logging, Resend SDK usage, custom FROM, error handling, no-throw) + template tests (content rendering, unsubscribe links)
- 634 total unit tests passing, type checks clean

## Session Log

### 2026-03-28 — TASK-66: PATCH /api/notifications/:nid/snooze — snooze notification until date
- Added PATCH `/:nid/snooze` endpoint in `server/src/routes/notifications.ts`
- Validates `snoozeUntil` is a valid ISO datetime string and in the future (400 if not)
- Finds notification by id AND user_id (404 if not found)
- Sets `snoozed_until` on the notification, returns 200 with updated notification via `.returning()`
- 7 unit tests: 401 no auth, 400 missing snoozeUntil, 400 past date, 404 not found, 200 success, db.update called, 400 invalid datetime
- 619 total unit tests passing, type checks clean

## Session Log

### 2026-03-28 — TASK-65: PATCH /api/notifications/:nid/read — mark notification as read
- Added PATCH `/:nid/read` endpoint to mark a single notification as read (checks ownership, returns 404 if not found)
- Added POST `/read-all` endpoint to mark all user unread notifications as read, returns `{ updated: rowCount }`
- 8 unit tests: 401 no auth (x2), 404 not found, 200 mark single read, db.update called, read-all with count, read-all with 0, read-all db.update called once
- 612 total unit tests passing, type checks clean


### 2026-03-28 — TASK-64: GET /api/notifications — list user notifications
- Created `server/src/routes/notifications.ts` with GET `/` handler
- Filters out snoozed notifications where `snoozed_until > NOW()`
- Supports `?unreadOnly=true` query param to filter only unread
- Returns `{ notifications, unreadCount }` ordered by `created_at DESC`, limit 50
- Mounted at `/api/notifications` with `requireAuth` in `app.ts`
- 6 unit tests: 401 no auth, 200 with all notifications + unread count, ordered by date, unreadOnly filter, empty list, db.select called twice
- 604 total unit tests passing, type checks clean

### 2026-03-28 — TASK-63: GET /api/share/:token — public read-only project data endpoint
- Created `server/src/routes/publicShare.ts` with GET `/:token` endpoint (no auth required)
- Looks up project by share_token WHERE is_public = true AND deleted_at IS NULL
- Returns project (name, type, description, status, progress, points, level, createdAt) plus milestones, todos, journal entries (non-deleted), and last 50 timeline events
- Does NOT expose sensitive fields: userId, shareToken, isPublic, githubRepoId, githubRepoName, deletedAt
- Mounted at `/api/share` BEFORE requireAuth middleware in app.ts
- 6 unit tests: 404 invalid token, no auth required, 200 with project data, returns all related data, no sensitive fields, 404 for private project
- 598 total unit tests passing, type checks clean

### 2026-03-28 — TASK-62: POST /api/projects/:id/share/revoke — revoke and regenerate share token
- Added POST `/revoke` handler in `server/src/routes/share.ts`
- Generates new UUID share token (old one becomes invalid), sets `isPublic = false`
- Returns 200 `{ message: "Share link revoked" }`
- 6 unit tests: 401 no auth, 404 not found, 200 success, db.update called, new token differs from old, works without existing token
- 592 total unit tests passing, type checks clean

### 2026-03-28 — TASK-61: POST /api/projects/:id/share/enable — generate public share token
- Route `server/src/routes/share.ts` with `mergeParams: true`, POST `/enable` endpoint
- Uses `getOwnedProject` for auth + ownership, generates UUID v4 share token via `crypto.randomUUID()`
- Sets `isPublic = true` and `shareToken` on project; idempotent (returns existing token if already public)
- Returns 200 `{ shareToken, shareUrl }` with FRONTEND_URL prefix
- Mounted at `/api/projects/:id/share` with `requireAuth` in `app.ts`
- 7 unit tests: 401 no auth, 404 not found, 200 success with token/url, db.update called, idempotent existing token, regenerate if public but no token, shareUrl format
- 586 total unit tests passing, type checks clean

### 2026-03-21 — TASK-60: DELETE /api/projects/:id/github/disconnect — remove GitHub repo link
- Added DELETE `/disconnect` handler in `server/src/routes/github.ts`
- Checks project ownership, returns 400 if no GitHub repo connected
- Clears `githubRepoId` and `githubRepoName` on the project, leaves imported commits/releases untouched
- Returns 200 `{ message: "GitHub repo disconnected" }`
- 6 unit tests: 401 no auth, 404 not found, 400 no repo connected, 200 success, db.update called, no delete of imported data
- 579 total unit tests passing, type checks clean

### 2026-03-21 — TASK-59: GitHub polling cron job — fetch new commits and releases every 60 minutes
- Installed `node-cron` and `@types/node-cron` in server
- Created `server/src/jobs/githubSync.ts` with `syncAllGithubProjects()` and `startGithubSyncJob()`
- `syncAllGithubProjects`: queries projects with github_repo_name + github_access_token via inner join on users, splits owner/repo, creates Octokit, calls `importCommitsForProject` per project, errors logged but don't stop other projects
- `startGithubSyncJob`: runs initial sync immediately, then schedules hourly via `cron.schedule('0 * * * *', ...)`
- Updated `server/src/index.ts` to call `startGithubSyncJob()` after DB connection confirmed
- 12 unit tests: query check, no projects noop, getOctokit called, importCommitsForProject params, multiple projects, error isolation, invalid repo format skip, error logging, cron schedule, startup message, initial sync trigger
- 573 total unit tests passing, type checks clean

### 2026-03-21 — TASK-58: GitHub commit import service — fetch and store last 90 days on connect
- Enhanced `importCommitsForProject` (renamed from `importCommits`, backward-compatible alias kept) in `server/src/services/githubService.ts`
- Commits: fetches last 90 days via `octokit.paginate`, inserts with ON CONFLICT DO NOTHING, awards +2 points and logs `github_commit` timeline event for each new commit
- Releases: fetches via `octokit.repos.listReleases`, filters to last 90 days, inserts with ON CONFLICT DO NOTHING, awards +25 points and logs `github_release` timeline event for each new release
- Added unique constraint on `github_releases(tag_name, project_id)` via migration `0013_add_github_releases_unique_constraint.sql`
- Updated schema in `server/src/db/schema/githubReleases.ts` with `uniqueIndex`
- 16 unit tests in `github-import.test.ts`: function existence, alias, paginate call, insert, +2 points per commit, timeline event per commit, skip duplicates, release import, +25 points per release, release timeline event, skip old releases, skip null published_at, error handling for commits/releases, skip duplicate releases
- 561 total unit tests passing, type checks clean

### 2026-03-21 — TASK-57: POST /api/projects/:id/github/connect — link GitHub repo to project
- Installed `@octokit/rest` in server
- Created `server/src/services/githubService.ts` with `getOctokit()`, `getRepo()`, and `importCommits()` (last 90 days, fire-and-forget, conflict-safe)
- Created `server/src/validators/github.ts` with `connectGithubSchema` (repoOwner, repoName)
- Created `server/src/routes/github.ts` with POST `/connect`: validates ownership, checks github_access_token, verifies repo access via Octokit, stores repo ID/name on project, triggers background commit import
- Mounted github router at `/api/projects/:id/github` in `app.ts`
- 11 unit tests: 401 no auth, 404 project not found, 400 missing repoOwner, 400 missing repoName, 400 no github token, 400 repo not found, 200 success, getOctokit called, getRepo called, project updated, importCommits fired
- 545 total unit tests passing, type checks clean

### 2026-03-21 — TASK-56: GitHub OAuth integration — connect GitHub account for repo access (also TASK-73: AES-256-CBC encryption utility)
- Created `server/src/utils/encryption.ts` with AES-256-CBC encrypt/decrypt using random IV, hex-encoded output (TASK-73)
- Added `github-repo` Passport strategy in `server/src/config/passport.ts` with `repo` scope, encrypts and stores access token on user record
- Added GET `/github/repo` (requireAuth) and GET `/github/repo/callback` routes in `server/src/routes/auth.ts`
- Added `GITHUB_REPO_CLIENT_ID` and `GITHUB_REPO_CLIENT_SECRET` to `.env.example`
- 9 encryption unit tests: round-trip, random IV, long strings, special chars, hex format, key validation, invalid format
- 6 auth-github-repo unit tests: 401 without auth, route registered, error redirect, user false redirect, success redirect, no refresh cookie
- 534 total unit tests passing, type checks clean

## Session Log

### 2026-03-21 — TASK-55: POST /api/projects/:id/parking-lot/:pid/promote — promote to milestone or todo
- Added `promoteParkingLotSchema` to `server/src/validators/parkingLot.ts` (targetType: 'milestone' | 'todo')
- Added POST `/:pid/promote` handler to `server/src/routes/parkingLot.ts`: validates ownership, finds item, creates milestone or todo from item title/description with correct sort_order, archives the parking lot item, returns 200 with created record
- 10 unit tests covering: auth 401, project 404, missing targetType 400, invalid targetType 400, item not found 404, promote to milestone 200, promote to todo 200, db.insert call count, db.update call count, null max sort order
- 519 total unit tests passing, type checks clean

## Session Log

### 2026-03-21 — TASK-54: PATCH /api/projects/:id/parking-lot/:pid — update or archive parking lot item
- Added `updateParkingLotSchema` to `server/src/validators/parkingLot.ts` (optional title, description, archived boolean)
- Added PATCH `/:pid` handler to `server/src/routes/parkingLot.ts`: validates ownership, checks item exists, updates fields; archived=true sets archived_at, archived=false clears it
- 12 unit tests covering: auth 401, project 404, item not found 404, empty body 400, empty/long title 400, long description 400, title update 200, description update 200, archive 200, unarchive 200, db.update call count
- 509 total unit tests passing, type checks clean

### 2026-03-21 — TASK-53: POST /api/projects/:id/parking-lot — add parking lot item
- Created `server/src/validators/parkingLot.ts` with `createParkingLotSchema` (title min 1/max 500, optional description max 2000)
- Added POST `/` handler to `server/src/routes/parkingLot.ts`: validates ownership, inserts item, returns 201
- 9 unit tests covering: auth 401, project 404, empty/missing/long title 400, long description 400, title-only 201, title+description 201, db.insert call
- 497 total unit tests passing, type checks clean

### 2026-03-21 — TASK-52: GET /api/projects/:id/parking-lot — list parking lot items
- Created `server/src/routes/parkingLot.ts` with GET handler: validates ownership, queries parking_lot_items ordered by `created_at DESC`
- Excludes archived items (`archived_at IS NULL`) by default; supports `?includeArchived=true` query param
- Returns `{ items }` response shape
- Mounted router at `/api/projects/:id/parking-lot` in `app.ts` behind requireAuth
- 7 unit tests covering: auth 401, project 404, non-archived items, empty array, includeArchived=true, db.select call count, ordering
- 488 total unit tests passing, type checks clean

### 2026-03-21 — TASK-51: GET /api/projects/:id/timeline — paginated timeline events with type filter
- Created `server/src/routes/timeline.ts` with GET handler: validates ownership, queries timeline_events ordered by `created_at DESC`
- Supports `?type=` comma-separated filter (validates against known event types), `?page=` and `?limit=` (default 50, max 100)
- Returns `{ events, total, page, limit }` response shape
- Mounted router at `/api/projects/:id/timeline` in `app.ts` behind requireAuth
- 11 unit tests covering: auth 401, project 404, events with pagination, empty array, single type filter, comma-separated types, invalid type ignored, page/limit params, limit cap at 100, default params, db.select call count
- 481 total unit tests passing, type checks clean

### 2026-03-21 — TASK-49: DELETE /api/projects/:id/journal/:jid — soft delete journal entry
- Added `DELETE /:jid` handler to `server/src/routes/journal.ts` — validates ownership, checks entry exists and not soft-deleted, sets `deleted_at`, returns 200
- 7 unit tests covering: auth 401, project 404, entry not found 404, already deleted 404, successful soft delete 200, db.update call, select call count
- 465 total unit tests passing, type checks clean

### 2026-03-21 — TASK-48: PATCH /api/projects/:id/journal/:jid — update journal entry
- Added `updateJournalSchema` to `server/src/validators/journal.ts` — partial update with title, body, mood (nullable), requires at least one field
- Added `PATCH /:jid` handler to `server/src/routes/journal.ts` — validates ownership, checks entry exists and not soft-deleted, updates fields + `updated_at`, returns 200
- 12 unit tests covering: auth 401, project 404, entry not found 404, empty body 400, empty title/body 400, invalid mood 400, title update 200, mood update 200, mood set to null 200, db.update call, soft-deleted entry 404
- 458 total unit tests passing, type checks clean

### 2026-03-21 — TASK-47: GET /api/projects/:id/journal — list journal entries
- Added GET `/` handler to `server/src/routes/journal.ts` with pagination (page, limit capped at 100)
- Queries non-deleted journal entries ordered by `created_at DESC` with LIMIT/OFFSET
- Returns `{ entries, total, page, limit }` response shape
- 9 unit tests covering: auth 401, project 404, entries with pagination metadata, empty array, page/limit params, limit cap at 100, invalid params defaults, db.select call count
- 446 total unit tests passing, type checks clean

### 2026-03-21 — TASK-46: POST /api/projects/:id/journal — create journal entry
- Created `server/src/validators/journal.ts` with `createJournalSchema` (title min 1/max 500, body min 1, optional mood enum)
- Created `server/src/routes/journal.ts` with POST handler: validates ownership, inserts journal entry, awards +5 points, logs journal timeline event
- Mounted router at `/api/projects/:id/journal` in `app.ts` with `mergeParams: true`
- 11 unit tests covering: auth 401, project 404, missing title/body 400, empty title/body 400, invalid mood 400, successful creation 201, optional mood, +5 points award, timeline event insertion
- 437 total unit tests passing, type checks clean

### 2026-03-21 — TASK-45: POST /api/projects/:id/points — manual points adjustment with reason
- Added `manualPointsSchema` to `server/src/validators/projects.ts` — validates delta (int, -500..500) and reason (1-255 chars)
- Added `POST /:id/points` handler to `server/src/routes/projects.ts` — validates ownership, calls `awardPoints()` with source `manual`
- Returns 200 with `{ pointsTotal, level, didLevelUp }`
- 12 unit tests covering: auth 401, project 404, missing reason/delta 400, delta out of range 400, empty/long reason 400, non-integer delta 400, positive delta 200, negative delta (floor 0) 200, level-up detection
- 426 total unit tests passing, type checks clean

### 2026-03-21 — TASK-43: Points service — award and deduct points based on events
- Wrapped points_log insert + projects update in a `db.transaction()` for atomicity
- 11 unit tests covering: select current points, transaction insert, atomic update, positive delta, negative delta clamped to 0, partial deduct, recalculateLevel call, timeline event logging, null coalesce, empty select, return structure
- 414 total unit tests passing, type checks clean

### 2026-03-21 — TASK-42: PATCH /api/projects/:id/todos/reorder — update todo sort order
- Added `reorderTodosSchema` to `server/src/validators/todos.ts` — validates `{ orderedIds: uuid[] }` with min 1
- Added `PATCH /reorder` handler to `server/src/routes/todos.ts` (defined before `/:tid` to avoid param collision)
- Validates project ownership, verifies all IDs belong to the project (400 if foreign), updates sort_order in a transaction
- Returns 200 `{ message: 'Order updated' }` on success
- 8 unit tests covering: auth 401, project 404, missing orderedIds 400, non-uuid 400, foreign IDs 400, successful reorder 200, transaction call, empty array 400
- 397 total unit tests passing, type checks clean

### 2026-03-21 — TASK-41: DELETE /api/projects/:id/todos/:tid — delete to-do
- Added `DELETE /:tid` handler to `server/src/routes/todos.ts` — validates ownership, finds todo by id+projectId, deletes permanently, recalculates progress
- Returns 200 with `{ message: 'Todo deleted', progress }` or 404 if todo not found
- 6 unit tests covering: auth 401, project 404, todo not found 404, successful deletion 200, db.delete called, progress recalculation
- 389 total unit tests passing, type checks clean

### 2026-03-21 — TASK-40: PATCH /api/projects/:id/todos/:tid — update to-do
- Added `updateTodoSchema` to `server/src/validators/todos.ts` — partial body with title, isCompleted, isUrgent, dueDate, milestoneId; requires at least one field
- Added `PATCH /:tid` handler to `server/src/routes/todos.ts` — validates ownership, finds todo, detects completion state changes, awards/deducts points accordingly
- Completing a todo awards +10 points via `awardPoints()`, uncompleting deducts -10 points; `completed_at` is set/cleared accordingly
- Returns `{ todo, progress }` with updated todo and recalculated progress
- 11 unit tests covering: auth 401, project 404, empty body 400, todo not found 404, title-only update (no points), completing (+10), uncompleting (-10), already-completed no-op, progress recalculation, multi-field update, clearing dueDate
- 383 total unit tests passing, type checks clean

### 2026-03-21 — TASK-39: GET /api/projects/:id/todos — list to-dos
- Added `GET /` handler to `server/src/routes/todos.ts` — validates ownership, queries todos ordered by `sort_order ASC`, supports optional `?milestoneId` and `?completed=true|false` filters
- 8 unit tests covering: auth 401, project 404, full list ordered, empty array, completed=true filter, completed=false filter, milestoneId filter, field correctness
- 372 total unit tests passing, type checks clean

### 2026-03-21 — TASK-38: POST /api/projects/:id/todos — create to-do
- Created `server/src/validators/todos.ts` with `createTodoSchema` (title, milestoneId, dueDate, isUrgent)
- Created `server/src/routes/todos.ts` with POST handler: validates ownership, optional milestone linkage, computes sort_order, inserts todo, recalculates progress
- Mounted router at `/api/projects/:id/todos` in `app.ts` with `mergeParams: true`
- 11 unit tests covering: auth 401, project 404, missing/empty title 400, sort_order 0/max+1, optional fields, milestone linkage, milestone not found 404, invalid milestoneId 400, recalculateProgress called
- 364 total unit tests passing, type checks clean

### 2026-03-21 — TASK-37: DELETE /api/projects/:id/milestones/:mid — delete milestone
- Added `DELETE /:mid` handler to `server/src/routes/milestones.ts` — validates ownership, deletes milestone by id+projectId, returns 200 with message or 404
- Linked todos have milestone_id set to null via FK set null on delete (handled at DB level)
- 5 unit tests covering: auth 401, project 404, milestone not found 404, successful deletion 200, db.delete call verification
- 353 total unit tests passing, type checks clean

### 2026-03-21 — TASK-36: POST /api/projects/:id/milestones/:mid/complete — complete milestone and award points
- Added `POST /:mid/complete` handler to `server/src/routes/milestones.ts` — validates ownership, finds milestone, checks not already completed
- Sets milestone `status = completed`, `completed_at = NOW()`
- Created `server/src/services/levelService.ts` with `getLevel()` pure function and `recalculateLevel()` — maps points to levels (Seed/Sprout/Growing/Shipping/Launched)
- Created `server/src/services/pointsService.ts` with `awardPoints()` — inserts points_log, updates project points_total (clamped >= 0), recalculates level, logs points_change timeline event
- Awards +50 points via `awardPoints()`, logs `milestone_completed` timeline event with milestone name
- Returns 200 with `{ milestone, project }` including updated points and level
- Returns 400 if milestone is already completed, 404 if milestone not found
- 9 unit tests for complete endpoint + 10 unit tests for getLevel()
- 348 total unit tests passing, type checks clean

### 2026-03-21 — TASK-35: PATCH /api/projects/:id/milestones/:mid — update milestone
- Added `updateMilestoneSchema` to `server/src/validators/milestones.ts` — partial body with name, description, dueDate, status; requires at least one field
- Added `PATCH /:mid` handler to `server/src/routes/milestones.ts` — validates ownership, finds milestone by id+projectId, updates fields, returns 200
- Returns 404 if milestone not found for the project
- 9 unit tests covering: auth 401, project 404, empty body 400, invalid status 400, milestone not found 404, name update, status update, multi-field update, db.update call verification
- 329 total unit tests passing, type checks clean

### 2026-03-21 — TASK-34: GET /api/projects/:id/milestones — list milestones
- Added `GET /` handler to `server/src/routes/milestones.ts` — validates ownership via `getOwnedProject`, queries milestones ordered by `sort_order ASC`, returns 200 with array
- 5 unit tests covering: auth 401, project 404, ordered list of 3 milestones, empty array, field correctness
- 320 total unit tests passing, type checks clean

### 2026-03-21 — TASK-33: POST /api/projects/:id/milestones — create milestone
- Created `server/src/validators/milestones.ts` with `createMilestoneSchema` (name, description, dueDate, status)
- Created `server/src/routes/milestones.ts` with POST handler: validates ownership, computes `sortOrder = max + 1`, inserts milestone, returns 201
- Mounted router at `/api/projects/:id/milestones` in `app.ts` with `mergeParams: true`
- 9 unit tests covering: auth 401, project 404, missing/empty name 400, invalid status 400, sort_order 0 for first milestone, sort_order max+1 for subsequent, optional fields, default pending status
- 315 total unit tests passing, type checks clean

### 2026-03-21 — TASK-32: Project progress auto-calculation service
- Created `server/src/services/progressService.ts` with `recalculateProgress(projectId)` function
- Queries todo completion ratio: `(completed / total) * 100`, returns 0 for no todos
- Updates `projects.progress_auto` in database
- Logs `progress_change` timeline event when progress changes by >= 5%
- Wiring into todo endpoints deferred to TASK-38/40/41 as specified
- 9 unit tests covering: zero todos, 50%/75%/100% calculation, rounding, timeline event logging (>= 5% threshold), no event on small changes, DB update verification, null handling
- 306 total unit tests passing, type checks clean

### 2026-03-21 — TASK-31: DELETE /api/projects/:id — soft delete project
- Added `DELETE /:id` handler to `server/src/routes/projects.ts` — validates ownership via `getOwnedProject`, sets `deletedAt = new Date()`, returns 200 `{ message: 'Project deleted' }`
- Already-deleted projects return 404 (filtered by `getOwnedProject`)
- 6 unit tests covering auth, 404 (non-existent, other user, already deleted), 200 soft delete, db.update call verification
- 297 total unit tests passing, type checks clean

### 2026-03-21 — TASK-30: PATCH /api/projects/:id — update project fields
- Added `updateProjectSchema` to `server/src/validators/projects.ts` — partial body with name, description, type, status
- Added `PATCH /:id` handler to `server/src/routes/projects.ts` — validates ownership, updates fields, logs status_change timeline event when status changes
- 9 unit tests covering auth, 404, empty body, invalid values, name update, status change with timeline event, same-status no event, multi-field update
- 291 total unit tests passing, type checks clean

## Session Log

### 2026-03-21 — TASK-29: GET /api/projects/:id — get single project detail
- Created `server/src/utils/projectOwnership.ts` — reusable helper that fetches a project by ID, validates ownership and soft-delete status, throws 404
- Added `GET /:id` handler to `server/src/routes/projects.ts` — returns project with milestones and todos arrays
- 7 unit tests covering auth, 404 (non-existent, other user, soft-deleted), 200 with milestones/todos, empty arrays, field checks
- 281 total unit tests passing, type checks clean

### 2026-03-21 — TASK-28: GET /api/projects — list all user projects
- Added `GET /` handler to `server/src/routes/projects.ts`
- Queries projects where `userId = req.userId` and `deletedAt IS NULL`, sorted by `updatedAt DESC`, limit 50
- Returns 200 with array of project objects including all required fields
- 6 unit tests covering auth, response shape, sorting, empty state, and query chain
- 274 total unit tests passing, type checks clean

### 2026-03-21 — TASK-26: Helmet.js and CORS configuration
- Updated CORS config in `server/src/app.ts`: fixed default origin to `http://localhost:5173`, added `methods` and `allowedHeaders` options
- Helmet already applied globally (X-Content-Type-Options, X-Frame-Options, CSP, HSTS)
- CORS allows only `FRONTEND_URL` origin with `credentials: true`
- 9 unit tests covering security headers (5) and CORS behavior (4)
- 258 total unit tests passing, type checks clean

## Session Log

### 2026-03-21 — TASK-25: Rate limiting on auth endpoints
- Rate limiters already implemented in `server/src/middleware/rateLimit.ts` (login: 5/15min, register: 10/hr, forgot-password: 3/hr)
- Rate limiters already applied to auth routes in `server/src/routes/auth.ts`
- 5 unit tests already passing in `server/src/__tests__/rate-limit.test.ts`
- Fixed cross-test rate limit interference: added rate limiter mocks to `auth-login`, `auth-register`, and `auth-forgot-password` test files
- 249 total unit tests passing, type checks clean

## Session Log

### 2026-03-21 — TASK-24: Auth middleware — verify JWT access token on protected routes
- Created `server/src/middleware/requireAuth.ts` — extracts Bearer token, verifies JWT, attaches `req.userId`
- Created `server/src/types/express.d.ts` — extends Express Request with `userId` property
- Applied `requireAuth` to all `/api` routes after `/api/health` and `/api/auth` (public routes excluded)
- Updated existing health test: `/api/nonexistent` now returns 401 (auth middleware catches before 404)
- 5 unit tests for requireAuth middleware, 5 integration tests for protected vs public route behavior
- 244 total unit tests passing, type checks clean

### 2026-03-21 — TASK-23: GET /api/auth/github — initiate GitHub OAuth login flow
- Installed `passport-github2` with type definitions
- Added GitHubStrategy to `server/src/config/passport.ts`
  - Find-or-create user by github_id or email
  - Updates github_id on existing email-matched users
  - Creates new OAuth-only users with no password_hash
  - Handles missing email gracefully (GitHub users can have private email)
- Added `GET /api/auth/github` route — redirects to GitHub consent screen with `user:email` scope
- Added `GET /api/auth/github/callback` — handles callback, issues tokens, redirects to frontend
  - On success: redirects to `FRONTEND_URL/auth/callback?token=ACCESS_TOKEN`
  - On failure: redirects to `FRONTEND_URL/login?error=oauth_failed`
  - Sets HttpOnly refresh token cookie and stores hashed token in DB
- 6 unit tests covering route registration, failure redirect, success redirect, cookie setting, token storage
- 233 total unit tests passing, type checks clean

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

### 2026-03-21 — TASK-27: POST /api/projects — create a project
- Created `server/src/validators/projects.ts` with Zod createProjectSchema
- Created `server/src/routes/projects.ts` with POST / handler
  - Validates input with Zod, inserts project in a DB transaction
  - Optionally seeds milestone templates with sort_order
  - Logs a timeline event (status_change: null → active)
  - Returns 201 with created project
- Mounted projects router in app.ts behind requireAuth middleware
- 268 unit tests passing (10 new for project creation), type checks clean

### 2026-03-21 — TASK-44: Level calculation service — compute project level from total points
- `server/src/services/levelService.ts` already existed with `getLevel` and `recalculateLevel`
- Added 6 new `recalculateLevel` tests (mocked DB): level-up detection, persistence, all thresholds
- 403 unit tests passing (16 in levelService.test.ts), type checks clean

### 2026-03-21 — TASK-50: Timeline events service — log all project events to timeline_events table
- Created `server/src/services/timelineService.ts` with `logTimelineEvent()` function
  - Accepts projectId, type, payload (JSONB), optional refId
  - Wraps insert in try/catch — errors are logged but never re-thrown (non-critical)
- Refactored existing routes (projects, milestones, journal) to use `logTimelineEvent` instead of inline `db.insert(timelineEvents)`
- Updated `projects-create.test.ts` to mock timelineService and adjust tx insert counts
- 470 unit tests passing (5 new for timelineService), type checks clean
