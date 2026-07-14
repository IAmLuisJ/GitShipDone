# Hosting Comparison — GitShipDone MVP

_Written 2026-07-13. Prices checked against provider docs/comparisons current as of July 2026;
verify before committing to a plan._

## What the app needs from a host

- **One Docker container** — the multi-stage `Dockerfile` serves the API and the static
  frontend from a single Express process (smoke-tested). No separate static host needed.
- **Postgres 15+** with real persistence and backups; `node dist/db/migrate.js` per deploy.
- **Always-on instance for Phase 2+** — reminder/GitHub-sync cron jobs run in-process.
  With MVP flags all off there is no cron, so scale-to-zero is tolerable *for now* but
  becomes a bug the day `FEATURE_REMINDERS` flips on.
- Low traffic, solo budget. Email is external (Resend), no other services.

## Options

| | Railway | Render | Fly.io | Hetzner VPS | Neon (DB only) |
|---|---|---|---|---|---|
| Est. monthly (app + DB) | **$6–12** ($5 base incl. $5 usage) | **~$13–14** ($7 web + $6–7 PG) | **~$4–6** (metered, always-on minimal) | **~$5–6** (CX23/CAX11, everything on one box) | $0 (free tier) + app host |
| Deploy from Dockerfile | Yes, auto-detected | Yes | Yes (CLI-first) | You run compose yourself | n/a |
| Managed Postgres | Yes, one click | Yes, with automatic daily backups | Semi — classic Fly PG is self-managed (manual backups/upgrades); managed tier costs more | No — you run the container and own backups | Yes, serverless |
| Always-on (cron-safe) | Yes | Paid tier yes; free tier spins down | Yes if you disable auto-stop | Yes | n/a (DB scales to zero on free) |
| Ops burden | Lowest | Low | Medium (CLI, volumes, PG ops) | Highest (TLS, patching, backups, monitoring) | Low |
| Watch out for | Usage-based creep as the DB grows | Egress now only 5 GB on Hobby ($0.15/GB after) | DB ops are on you; pricing is per-second metered | You are the SRE | 0.5 GB storage + 100 CU-hr/mo hard caps, then the DB suspends |

**Not a fit:** Vercel/Netlify — the app is a long-lived Express monolith with a pg pool
and in-process cron; serverless would mean re-architecting, which contradicts the
ship-the-MVP strategy.

## Recommendation

**Railway** — deploy the repo's Dockerfile as-is, add the Postgres plugin, set the four
required secrets + `FRONTEND_URL`, and add `node dist/db/migrate.js` as the pre-deploy
command. It is the fastest path from the artifact we already verified to a URL, stays
always-on (Phase 2 cron works unchanged), and lands at roughly $6–12/mo.

- **Runner-up: Render** if you prefer flat, predictable pricing and want automatic
  database backups without thinking about them (~$13–14/mo).
- **Cheapest managed-ish: Fly.io** (~$4–6/mo) if you're comfortable owning Postgres
  backups/upgrades yourself.
- **Cheapest overall: Hetzner CX23** (~$5/mo for everything, 20 TB traffic) if you want
  to run `docker compose` on a box and don't mind being your own ops team.
- **Free-to-start hybrid:** Neon free tier for the DB + any app host — fine for a beta,
  but the 0.5 GB / 100 CU-hour caps suspend the DB when exceeded, so budget to upgrade
  once real users arrive.

## First-deploy checklist (any host)

1. Provision Postgres; set `DATABASE_URL`.
2. Set `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` (32 chars), `FRONTEND_URL`,
   `RESEND_API_KEY`. Leave all `FEATURE_*` unset (off) for the MVP.
3. Run `node dist/db/migrate.js` (from `/app/server`) before first start and on each deploy.
4. Point uptime monitoring at `GET /api/health`.
5. Confirm the boot-guard works: deploying with a missing secret should crash, not serve.
