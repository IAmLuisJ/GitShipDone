# GitShipDone — Phased Roadmap to MVP and Beyond

_Last updated: 2026-07-13. Based on a full audit of builds, tests, lint, and code structure._

## Where the project stands

Nearly all product code is already written — both sides of the stack:

- **Backend (Express + Drizzle + Postgres)**: routes for auth (email, Google, GitHub OAuth),
  projects, milestones, todos, journal, timeline, points/levels, parking lot, notifications,
  sharing, GitHub sync, and AI. Builds clean. **733/733 unit tests pass.**
- **Frontend (React 19 + Vite + shadcn)**: all pages and tabs are built and wired to the real
  API via axios + TanStack Query (no mock data). Builds clean.
- **Infra**: Docker Compose Postgres (tmpfs, dev-only), Drizzle migrations 0000–0009+,
  Vite proxy `/api` → `:3001`.

The gaps are **verification and shipping**, not features:

| # | Gap | Evidence |
|---|-----|----------|
| 1 | Frontend test harness broken — all 131 frontend tests fail with `document is not defined` | No vitest config at root → tests run in `node` env instead of `jsdom`. Single root cause. |
| 2 | Lint/test commands sweep generated + stale files | 419 lint "errors": 50 in `server/dist`, 34 in stale `.claude/worktrees`, 3 in `.agent`. Only **24 real** (in `server/src`, mostly `no-explicit-any`). Root `vitest` also collects worktree + server tests. |
| 3 | Only one e2e spec (`tests/accessibility.spec.ts`) | No signup → create project → milestone flow coverage. |
| 4 | No deployment story | No Dockerfile/CI/platform config; compose DB uses tmpfs (data lost on restart); JWT dev-fallback secrets; README env-path mismatch. |
| 5 | Full env surface required to run everything | Google OAuth, 2× GitHub OAuth apps, Resend, AI keys — most unnecessary for an MVP. |

---

## Phase 0 — Stabilize (trust your tooling) ✅ (completed 2026-07-13)

Goal: `build`, `lint`, and `test` all pass and only look at real source.

1. **Fix frontend tests**: add `test` config (root `vitest.config.ts` or `vite.config.ts` `test` block) with `environment: "jsdom"`, `include: ["src/**/*.test.{ts,tsx}"]`, jest-dom setup file. This alone should flip ~131 failures.
2. **Scope tooling**: ESLint ignores for `server/dist`, `dist`, `.claude`, `.agent`, `playwright-report`, `test-results`; delete stale worktrees (`.claude/worktrees/*`); keep server tests running only via `cd server && npm test`.
3. **Fix the 24 real lint errors** in `server/src` (typed replacements for `any`).
4. **CI**: GitHub Actions running frontend build/lint/test + server build/test on PR.

Exit criteria: clean `npm run build && npm run lint && npx vitest run` at root, `npm run build && npm test` in `server/`, enforced in CI.

## Phase 1 — Shippable MVP (no AI, no GitHub) — ✅ code-complete (2026-07-13)

Goal: a stranger can sign up, create a project, and log progress toward milestones — in production.

> Status: implemented and verified — feature flags (frontend `src/lib/features.ts`
> + server `FEATURE_*` env gates; AI/GitHub/OAuth off by default), boot-time env
> validation (production refuses to start without secrets — verified in a
> container), JWT prod-fallback removal, 1 MB body limit, persistent Postgres
> volume, multi-stage Dockerfile serving API + static frontend with SPA fallback
> (smoke-tested: health check, static serving, SPA fallback, real registration,
> gated routes 404). Core-loop e2e suite (`tests/core-loop.spec.ts`, 5 tests) plus
> the accessibility spec pass — 7/7. Rich text was audited: it renders through
> TipTap's schema (no raw-HTML path), so no additional sanitizer is required.
> **Remaining: pick a hosting target and do the first real deploy** (the only
> non-code exit criterion).

**In scope**: email/password auth (register, login, forgot/reset password) · create-project wizard with milestone templates · milestones (create, reorder, complete + confetti) · todos · journal updates (rich text, mood) · timeline · progress bar (auto + manual) · dashboard · basic settings.

**Deferred (feature-flagged off, not deleted — the code is built and will return in later phases)**: AI chat/pathways/settings, GitHub login + repo sync, Google OAuth, public sharing, notifications, points/levels emails.

Work items:
1. **Feature flags**: a small `src/lib/features.ts` (frontend) + env-driven gate on server AI/GitHub routes. Hide: AI settings form, AI chat panel, AI pathway button in parking lot, GitHub connect panel, OAuth buttons on login/register.
2. **Trim required env** to: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `RESEND_API_KEY` (password reset), `FRONTEND_URL`, `PORT`. Server must **fail boot in production** on missing secrets (remove dev JWT fallbacks in prod mode).
3. **Persistent database**: managed Postgres (Neon/Supabase/Railway) or compose volume instead of tmpfs; documented migration step (`db:migrate`) in deploy pipeline.
4. **E2E the core loop** (Playwright): signup → login → create project (with templates) → add/complete todo → log journal update → complete milestone → verify timeline + progress + dashboard card. Plus forgot/reset password.
5. **Security minimum**: sanitize rich-text rendering (DOMPurify) anywhere journal HTML is displayed, request body size limits, cookie SameSite/secure settings.
6. **Deploy**: Dockerfile (server + static frontend) or platform config, `/api/health` wired to uptime check, README corrected (env paths, setup steps, prod deploy doc).

Exit criteria: production URL where the full core loop works; e2e suite green against a production build.

## Phase 2 — Engagement layer — ✅ code-complete (2026-07-13)

Points & levels (+ level-up celebration) · public share pages (read-only URL) · notification bell · email milestone reminders (Resend + cron).

> Status: points/levels, sharing, and notifications were never gated (no external
> deps) and are now covered by `tests/engagement.spec.ts` (5 e2e tests: points on
> milestone completion, bell empty state, public share page read-only, revoke).
> Reminders hardened: per-day dedupe was already present; added an overlap guard,
> run-count reporting, and a `CRON_SECRET`-authenticated trigger
> (`POST /api/jobs/reminders/run`) for hosts where in-process cron is unreliable
> (Passenger/shared hosting — see docs/DEPLOY-NAMECHEAP.md). Setting `CRON_SECRET`
> disables the in-process scheduler. To turn reminders on in production:
> `FEATURE_REMINDERS=true` (+ `CRON_SECRET` + cPanel cron on Namecheap).

## Phase 3 — GitHub integration

GitHub OAuth login + separate repo-access OAuth app · connect repo per project · commit/release import into timeline · sync job. Review OAuth scopes (narrow from full `repo` if possible).

## Phase 4 — AI features

User-supplied OpenAI/Anthropic keys (AI settings, encrypted at rest — already implemented) · AI PM chat · parking-lot pathway generation · release summaries. Ship last: highest surface area, zero value until the core habit loop works.

---

## Suggested order of attack

Phase 0 is roughly a day of work and unblocks everything else. Phase 1 is mostly *removal and verification* rather than construction — the risk is in deployment plumbing and e2e coverage, not features.
