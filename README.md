# GitShipDone

A solo-builder-first project tracking platform. Think of it as a personal project journal meets changelog generator meets AI product manager — built for developers and makers running multiple projects in parallel.

You start a project with a vision, log updates, hit milestones, and watch your project's full history unfold in a timeline. Connect a GitHub repo and get automatic changelogs. Add ideas to a parking lot and let AI generate pathways to implement them. Share progress with anyone via a read-only public URL.

---

## Features

- **Projects** — Create projects with a name, type (software, design, physical, etc.), and vision statement
- **Milestones & Todos** — Set goals and track to-dos; progress auto-calculates from completion
- **Journal / Update Log** — Rich-text journal entries with mood tags to document the journey
- **Timeline View** — Full project history: journal entries, milestones, GitHub commits, progress changes, points
- **Points & Levels** — Earn points for todos, milestones, and commits; level up from Seed to Launched
- **GitHub Integration** — Connect a repo via GitHub OAuth; auto-import commits and releases as timeline events
- **AI PM Copilot** — Context-aware AI assistant (OpenAI or Anthropic) for next steps and milestone suggestions
- **Parking Lot** — Capture ideas; AI generates step-by-step implementation pathways
- **Alerts & Reminders** — In-app notification center + email reminders for upcoming milestones
- **Project Sharing** — Read-only public URLs; anyone can view without an account

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Express.js + Node.js + TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL 15 |
| Auth | JWT + Passport.js (Email, Google OAuth, GitHub OAuth) |
| AI | OpenAI GPT-4o / Anthropic Claude (user-supplied API key) |
| Email | Resend |
| Local dev | Docker Compose |

---

## Getting Started

### Prerequisites

- Node.js 22+
- Docker (for PostgreSQL)

### 1. Clone and install

```bash
git clone https://github.com/your-username/gitshipdone.git
cd gitshipdone

# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Fill in `server/.env`:

```env
DATABASE_URL=postgresql://gitshipdone:gitshipdone@localhost:5432/gitshipdone
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REPO_CLIENT_ID=
GITHUB_REPO_CLIENT_SECRET=
RESEND_API_KEY=
ENCRYPTION_KEY=                 # exactly 32 characters
FRONTEND_URL=http://localhost:5173
PORT=3000
```

### 3. Start the database

```bash
docker compose up -d
```

### 4. Run migrations

```bash
cd server && npm run db:migrate
```

### 5. Start development servers

In two terminals:

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Project Structure

```
gitshipdone/
├── src/                  # Frontend (React + TypeScript)
│   ├── components/       # Shared and feature components
│   ├── pages/            # Route-level page components
│   ├── hooks/            # Custom React hooks
│   ├── stores/           # Zustand state stores
│   └── lib/              # API client, query client
├── server/               # Backend (Express + TypeScript)
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic (points, progress, timeline, AI)
│   │   ├── db/           # Drizzle schema and database client
│   │   ├── middleware/   # Auth, rate limiting, error handling
│   │   ├── jobs/         # Cron jobs (GitHub sync, reminders)
│   │   └── utils/        # JWT, encryption utilities
│   └── drizzle/          # Database migrations
├── docker-compose.yml    # PostgreSQL for local dev
└── .agent/               # PRD, task specs, and project docs
    ├── prd/PRD.md        # Full product requirements document
    ├── prd/SUMMARY.md    # Executive summary
    └── tasks.json        # Implementation task index (120 tasks)
```

---

## Scripts

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests with Vitest |
| `npm run coverage` | Run tests with coverage report |
| `npm run db:up` | Start PostgreSQL via Docker Compose |
| `npm run db:down` | Stop PostgreSQL |
| `npm run db:reset` | Stop, wipe, and restart PostgreSQL |

### Backend (`cd server`)

| Command | Description |
|---|---|
| `npm run dev` | Start Express server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run db:migrate` | Apply database schema |
| `npm run db:studio` | Open Drizzle Studio (DB browser) |

### Docker

| Command | Description |
|---|---|
| `docker compose up -d` | Start PostgreSQL |
| `docker compose down` | Stop PostgreSQL |
| `docker compose down -v` | Stop and remove all data |

---

## Documentation

Full product requirements and implementation tasks live in `.agent/`:

- **[PRD](.agent/prd/PRD.md)** — Complete product requirements, data model, user flows, and technical decisions
- **[Task Index](.agent/tasks.json)** — 120 implementation tasks with categories and dependencies
- **[Task Specs](.agent/tasks/)** — Detailed spec for each task with acceptance criteria and steps
