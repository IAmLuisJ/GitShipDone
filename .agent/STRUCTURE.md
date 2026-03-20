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
│   │   │       └── todos.ts
│   │   ├── routes/
│   │   │   └── health.ts
│   │   └── middleware/
│   │       └── errorHandler.ts
│   ├── drizzle/
│   │   ├── 0000_create_users.sql
│   │   ├── 0001_create_projects.sql
│   │   ├── 0002_create_milestones.sql
│   │   ├── 0003_create_todos.sql
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
