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
│   │   │       └── index.ts
│   │   ├── routes/
│   │   │   └── health.ts
│   │   └── middleware/
│   │       └── errorHandler.ts
│   ├── drizzle/
│   │   └── meta/
│   │       └── _journal.json
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
