# Project Structure

```
gitshipdone/
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── main.tsx
│   ├── index.css
│   ├── assets/
│   ├── playwright.config.ts
│   └── vitest.config.ts
├── server/
│   ├── src/
│   │   ├── index.ts
│   │   ├── app.ts
│   │   ├── db/
│   │   │   ├── index.ts
│   │   │   ├── migrate.ts
│   │   │   └── schema/
│   │   │       ├── index.ts
│   │   │       ├── users.ts
│   │   │       ├── projects.ts
│   │   │       ├── milestones.ts
│   │   │       ├── todos.ts
│   │   │       ├── journalEntries.ts
│   │   │       ├── timelineEvents.ts
│   │   │       ├── pointsLog.ts
│   │   │       ├── parkingLotItems.ts
│   │   │       ├── githubCommits.ts
│   │   │       ├── notifications.ts
│   │   │       ├── refreshTokens.ts
│   │   │       ├── passwordResetTokens.ts
│   │   │       └── githubReleases.ts
│   │   ├── routes/
│   │   │   ├── health.ts
│   │   │   ├── auth.ts
│   │   │   ├── projects.ts
│   │   │   └── milestones.ts
│   │   ├── config/
│   │   │   └── passport.ts
│   │   ├── services/
│   │   │   ├── email.ts
│   │   │   └── progressService.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   └── projectOwnership.ts
│   │   ├── validators/
│   │   │   ├── auth.ts
│   │   │   ├── projects.ts
│   │   │   └── milestones.ts
│   │   ├── types/
│   │   │   └── express.d.ts
│   │   └── middleware/
│   │       ├── errorHandler.ts
│   │       └── requireAuth.ts
│   ├── drizzle/
│   │   ├── 0000_create_users.sql
│   │   ├── 0001_create_projects.sql
│   │   ├── 0002_create_milestones.sql
│   │   ├── 0003_create_todos.sql
│   │   ├── 0004_create_journal_entries.sql
│   │   ├── 0005_create_timeline_events.sql
│   │   ├── 0006_create_points_log.sql
│   │   ├── 0007_create_parking_lot_items.sql
│   │   ├── 0008_create_github_commits.sql
│   │   ├── 0009_create_github_releases.sql
│   │   ├── 0010_create_notifications.sql
│   │   ├── 0011_create_refresh_tokens.sql
│   │   ├── 0012_create_password_reset_tokens.sql
│   │   └── meta/
│   │       ├── _journal.json
│   │       └── 0000_snapshot.json
│   ├── drizzle.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── public/
├── docker-compose.yml
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
├── index.html
└── .env.example
```
