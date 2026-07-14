# Deploying to Namecheap Shared Hosting (cPanel)

_Written 2026-07-13 for Stellar-class shared hosting with cPanel. If you actually have a
Namecheap **VPS** (root access), skip all of this: install Docker and run the repo's
`Dockerfile` + `docker-compose.yml` directly._

Shared hosting has no Docker, so this deploys the app the cPanel way: compiled server
files run under **Setup Node.js App** (Phusion Passenger), and Express serves the built
frontend via `STATIC_DIR`, exactly like the production container does.

## Known constraints on this platform

| Constraint | Impact |
|---|---|
| PostgreSQL is version **10** | Our schema defaults every PK to `gen_random_uuid()`, built-in only since PG13. On PG10 it requires the `pgcrypto` extension — step 2 below. |
| Passenger idle-stops the process | Fine for the MVP (no cron). Before enabling `FEATURE_REMINDERS`/`FEATURE_GITHUB`, replace in-process cron with cPanel Cron Jobs hitting an endpoint. |
| No Docker, LVE resource caps | Deploy compiled JS, not containers; keep memory modest. |
| Node selector | Choose **22.x** (matches `engines` in package.json). |

## 1. Create the database

1. cPanel → **PostgreSQL Databases** → create database (`<cpuser>_gitshipdone`), create a
   user, add the user to the database with all privileges.
2. Note the credentials. The connection string is:
   `postgresql://<cpuser>_<dbuser>:<password>@localhost:5432/<cpuser>_gitshipdone`

## 2. Enable pgcrypto (required on PG < 13)

In cPanel → **phpPgAdmin** (or `psql` over SSH), run against your database:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SELECT gen_random_uuid();  -- must return a UUID
```

If this fails with a permission error, open a Namecheap support ticket asking them to
enable `pgcrypto` on your database. If they won't, use a free external Postgres instead
(e.g. Neon) and set `DATABASE_URL` to it with `?sslmode=require` — everything else below
stays the same.

## 3. Build locally

```bash
npm ci && npm run build                # frontend → dist/
cd server && npm ci && npm run build   # server  → server/dist/
```

Frontend feature flags default off — exactly what the MVP wants — so no `VITE_*` vars
are needed at build time.

## 4. Assemble the upload bundle

Create this layout locally and zip it:

```
gitshipdone/
├── dist/              # contents of server/dist
├── drizzle/           # contents of server/drizzle (migration SQL + meta)
├── client/            # contents of the frontend dist/
├── package.json       # copy of server/package.json
└── package-lock.json  # copy of server/package-lock.json
```

## 5. Upload

cPanel → **File Manager** → create `~/gitshipdone` (in your home directory, **not** under
`public_html`) → upload the zip → extract.

Create `~/gitshipdone/.env` (File Manager → new file, then set permissions to 600):

```env
NODE_ENV=production
DATABASE_URL=postgresql://<cpuser>_<dbuser>:<password>@localhost:5432/<cpuser>_gitshipdone
JWT_SECRET=<long random string>
JWT_REFRESH_SECRET=<different long random string>
ENCRYPTION_KEY=<exactly 32 characters>
FRONTEND_URL=https://yourdomain.com
RESEND_API_KEY=<key, or omit to log emails instead>
STATIC_DIR=/home/<cpuser>/gitshipdone/client
```

Do **not** set `PORT` — Passenger assigns it. Both the app and the migration script load
this file automatically (`dotenv/config`).

## 6. Create the Node.js app

cPanel → **Setup Node.js App** → Create Application:

- **Node.js version**: 22.x
- **Application mode**: Production
- **Application root**: `gitshipdone`
- **Application URL**: your domain or subdomain
- **Application startup file**: `dist/index.js`

Then click **Run NPM Install** (installs the server's runtime deps — all pure JS, no
native builds, so this works within shared-hosting limits).

## 7. Run migrations (SSH)

Enable SSH in cPanel (**SSH Access**) if needed, then:

```bash
ssh <cpuser>@<server>
source ~/nodevenv/gitshipdone/22/bin/activate
cd ~/gitshipdone
node dist/db/migrate.js     # reads .env; must print "[migrate] Migrations complete"
```

Re-run this step after every deploy that adds migrations.

## 8. Start and verify

1. Setup Node.js App → **Restart** the application.
2. `https://yourdomain.com/api/health` → `{"status":"ok", ...}`
3. `https://yourdomain.com/` → landing page loads; register an account and run through
   the core loop (create project → todo → journal update → milestone).
4. Confirm the boot guard: temporarily removing `JWT_SECRET` from `.env` and restarting
   should crash the app, not serve traffic. Put it back and restart.

## Updating a deployment

```bash
# locally
npm run build && (cd server && npm run build)
# re-upload dist/ and client/ (and drizzle/ if migrations changed), then
# SSH: node dist/db/migrate.js   (if migrations changed)
# cPanel: Restart the app
```

## Phase 2 note (before flipping FEATURE_REMINDERS / FEATURE_GITHUB)

In-process `node-cron` is unreliable under Passenger because idle processes are stopped.
Add authenticated trigger endpoints (or standalone scripts) and schedule them with
cPanel → **Cron Jobs** instead.
