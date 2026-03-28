# Project Bootstrap Reference

Practical reference for spinning up new projects using the `gitshipdone` and `community-events` stacks as templates.

---

## 1. Stack Comparison

| | **gitshipdone** | **community-events** |
|---|---|---|
| Frontend framework | React 19 + TypeScript 5.9 + Vite 7 | React 19 + TypeScript 5.9 + Vite 7 |
| Styling | None (intentional) | Tailwind v4 via `@tailwindcss/vite` |
| Component library | None | shadcn/ui (Radix UI + CVA + clsx + tailwind-merge) |
| Routing | None | React Router v7 |
| Data fetching | None | TanStack Query v5 |
| Forms | None | React Hook Form v7 |
| Validation | None | Zod v4 |
| Backend | None | Express v5 |
| Database | None (Docker Compose for DB infra) | better-sqlite3 |
| Auth | None | JWT + bcryptjs + openid-client |
| Email | None | nodemailer |
| Testing (unit) | Vitest 3 + @testing-library, node env | Vitest 3 + @testing-library, jsdom (frontend) + node (server) |
| Testing (e2e) | Playwright | Playwright |
| Linting | ESLint + react-hooks + react-refresh + typescript-eslint | ESLint + typescript-eslint |
| Formatting | Prettier | None |
| PDF | None | @react-pdf/renderer |
| Node version | 22 | 22 |
| Tailwind config file needed? | N/A | No — Vite plugin only |

---

## 2. Key Observations

- **gitshipdone has no Tailwind** — it's intentionally minimal, not an oversight. Use it when you need a blank canvas or are bringing your own styling approach.
- **Tailwind v4 requires no `tailwind.config.js`** — configuration happens in CSS via `@theme` and `@import`. The `@tailwindcss/vite` plugin handles everything. If you see a `tailwind.config.*` file in a v4 project, something's wrong.
- **Both use the same composite tsconfig pattern** — `tsconfig.json` holds only `references`, while `tsconfig.app.json` (browser/React) and `tsconfig.node.json` (Vite config) carry the actual compiler options. Strict mode, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `moduleResolution: bundler`.
- **`@/*` path alias is consistent across both projects** — mapped in `tsconfig.app.json` and mirrored in `vite.config.ts`. Don't break this when templating.
- **community-events pins exact versions for runtime deps, uses ranges for devDeps** — deliberate. Reproducibility matters for production deps; flexibility is fine for tooling.
- **community-events has two Vitest configs** — `jsdom` environment for frontend tests, `node` for server tests (via `environmentMatchGlobs`). Don't run server tests with jsdom or you'll get subtle false passes.
- **Docker Compose in gitshipdone is for DB infra only** — the app itself is not containerized. `db:up`, `db:down`, `db:reset` scripts manage the database container independently.

---

## 3. Bootstrapping Options

### Option A: GitHub Template Repository

**How it works:** Mark the repo as a template in GitHub Settings → check "Template repository". Anyone (including you) clicks "Use this template" on the GitHub UI, gets a clean repo with no git history.

**Pros:**
- Zero tooling required
- Always reflects the current state of the template
- Works for collaborators who don't have your scripts

**Cons:**
- GitHub UI required — no terminal workflow
- No customization at creation time (you get the full template, then delete what you don't need)
- Requires keeping the template repo clean and up to date

**Best for:** Full-stack projects where you always want everything (`community-events`). Share with teammates without requiring local tooling.

---

### Option B: Bash Script

**How it works:** A shell script that orchestrates `npm create vite@latest` with the `react-ts` template, installs your standard deps, writes config files (tsconfig split, vite.config, vitest.config, ESLint, Prettier if needed), optionally layers in Tailwind+shadcn, and sets up the folder structure.

```bash
./create-project.sh my-app --full-stack
./create-project.sh my-app --frontend-only
```

**Pros:**
- Lives in the repo — no external dependency
- Easy to read and modify
- Handles the boring parts (config files, folder structure, installs)

**Cons:**
- Bash is brittle across platforms (especially Windows)
- No interactive prompts without significant extra effort
- Gets messy as options multiply

**Best for:** Solo use, Mac/Linux only, when you want a quick automated setup without building a full CLI.

---

### Option C: CLI Tool (`create-luis-app`)

**How it works:** A proper Node.js CLI, run via `npm create luis-app` or `npx create-luis-app`. Uses `commander` for flag parsing and `prompts` for interactive setup. Asks what you need, generates only that, runs install.

**Pros:**
- Interactive — picks exactly what the project needs
- Cross-platform
- Publishable to npm or installable globally from local path
- Cleanest separation between template logic and generated output

**Cons:**
- Most upfront work
- Needs maintenance as deps change
- Overkill if you start fewer than ~6 projects a year

**Best for:** If you start projects frequently, want to share the stack with others, or want a consistent "this is how I build things" artifact.

---

### Option D: degit

**How it works:** `npx degit luisjuarez/community-events my-new-app` clones the repo without git history. No GitHub UI, no npm package needed.

```bash
# Full stack
npx degit luisjuarez/community-events my-new-app

# Minimal frontend
npx degit luisjuarez/gitshipdone my-new-app
```

Add an alias in `.zshrc` for convenience:
```bash
alias new-app='npx degit luisjuarez/community-events'
alias new-app-minimal='npx degit luisjuarez/gitshipdone'
```

**Pros:**
- One command, no setup
- No GitHub UI required
- Supports subdirectory scaffolding (`user/repo/subdir`)

**Cons:**
- No customization — you get the whole template
- Must clean up unused parts manually
- Requires the source repo to be public (or use a token for private)

**Best for:** Quick spins when you know exactly which template you want and don't need customization.

---

## 4. Recommendation

**Default path: GitHub template for `community-events`**
Set `community-events` as a GitHub template repository. For any new full-stack project, "Use this template" is the fastest path that requires no tooling and always gives a clean slate with the full stack in place.

**Quick terminal spins: degit or bash script**
For one-off experiments or when you want to stay in the terminal, `npx degit` is the fastest option. A bash script is worth having for cases where you want to vary the setup (e.g., skip the backend, add PDF support).

**CLI tool: build it if you hit the threshold**
If you start more than ~6 new projects a year, or want to share this stack with other developers, invest in `create-luis-app`. The interactive prompts solve the "I want 80% of the template, not 100%" problem cleanly.

The CLI would prompt for:
- Project name
- Template: `minimal` (gitshipdone) | `full-stack` (community-events)
- Include Tailwind + shadcn?
- Include Express backend?
- Include auth (JWT + openid-client)?
- Include PDF renderer?

---

## 5. CLI Tool Sketch

### Prompts

```
? Project name: my-app
? Template:
  ❯ minimal (React + Vite + TypeScript, no styling)
    full-stack (React + Express + SQLite + Tailwind + shadcn)
? Include Tailwind v4 + shadcn/ui? (Y/n)         [if minimal selected]
? Include Express backend + SQLite? (Y/n)          [if minimal selected]
? Include auth (JWT + openid-client)? (Y/n)        [if backend selected]
? Include PDF renderer (@react-pdf/renderer)? (y/N)
```

### What gets generated

| Selection | Output |
|---|---|
| minimal | Vite + React + TS, composite tsconfig, Vitest (node), Playwright, ESLint, Prettier |
| + Tailwind | Adds `@tailwindcss/vite`, updates `vite.config.ts`, no config file |
| + shadcn | Adds Radix UI, CVA, clsx, tailwind-merge, tw-animate-css, base component structure |
| + backend | Adds `server.js`, Express v5, better-sqlite3, cors, dotenv, cookie-parser |
| + auth | Adds bcryptjs, JWT, openid-client, express-rate-limit, auth routes |
| + PDF | Adds `@react-pdf/renderer`, example template component |
| full-stack | All of the above, pre-composed |

### Suggested tech

```
dependencies:
  commander        # flag parsing
  prompts          # interactive CLI prompts
  fs-extra         # file operations with mkdirp, copy, etc.
  chalk            # terminal output
  execa            # running npm install, git init
```

### Install locally

```bash
# From the CLI tool repo directory
npm link

# Or install globally from local path
npm install -g ./

# Unlink
npm unlink create-luis-app
```

### Example usage

```bash
# Interactive
npm create luis-app
npx create-luis-app

# With flags (non-interactive)
npx create-luis-app my-app --template full-stack
npx create-luis-app my-app --template minimal --tailwind --backend
npx create-luis-app my-app --template minimal  # bare React + Vite

# Output
✔ Project name: my-app
✔ Template: full-stack
✔ Auth: yes
✔ PDF: no

Scaffolding my-app...
✔ Files written
✔ Dependencies installed (npm install)
✔ Git initialized

Done. Next steps:
  cd my-app
  cp .env.example .env
  npm run dev
```

### File structure generated (full-stack)

```
my-app/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── main.tsx
│   └── index.html
├── server/
│   ├── routes/
│   ├── middleware/
│   ├── db/
│   └── index.js
├── tests/
│   ├── unit/
│   └── e2e/
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
├── .env.example
└── package.json
```
