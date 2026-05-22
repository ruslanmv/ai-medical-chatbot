# Database deployment

MedOS supports **two database drivers** chosen at runtime by a single env var.

| `DATABASE_URL` set? | Driver | Use case |
|---|---|---|
| Yes, starts with `postgres://` or `postgresql://` | **Postgres** (production) | Vercel, Hugging Face Spaces, CI smoke tests |
| Unset or invalid | **SQLite** (fallback) | Local development, ephemeral previews, offline self-hosting |

The schema is the same on both drivers. Migrations apply driver-specific SQL automatically.

> **Refusing the fallback in production.** When `NODE_ENV=production` and `DATABASE_URL` is missing or invalid, the server refuses to start instead of silently coming up on SQLite. There is no separate flag — `NODE_ENV` already tells us this is production. Set `NODE_ENV=development` locally to opt into the SQLite fallback.

## Choosing a Postgres host

The project is tested against **Neon** but works with any Postgres ≥ 13 — Supabase, Railway, RDS, Cloud SQL, plain `postgres:16`. Neon's pooler endpoint (`...-pooler....neon.tech`) is what the code expects for serverless deployments.

## The one new env var

For the database migration itself you only have to add **one** variable:

| Var | Type | Example |
|---|---|---|
| `DATABASE_URL` | secret | `postgresql://USER:PASS@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require` |

Everything else (SSL mode, pool size, statement timeout, fallback path) has a sensible default baked into the code. Defaults are listed at the bottom of this doc — you only override them if a deployment proves you need to.

The pre-existing MedOS env vars stay the same; they were already required before this migration:

- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — first-run admin seed.
- `ENCRYPTION_KEY` — at-rest encryption for BYO HF tokens.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL` — email transport.
- `APP_URL` — used in outbound email links.
- `NODE_ENV` — standard Node.js env tag. Set to `production` on Vercel + HF.

See `.env.example` for the consolidated list.

## Setting env vars per platform

### GitHub Actions

`Settings → Secrets and variables → Actions`.

- **Repository secrets** for everything tagged "**secret**" above.
- **Repository variables** for everything tagged "variable".

Per-environment scoping: if you have a `production` and a `staging` Action environment, set them separately so previews can target Neon's preview branches.

Reference in a workflow:

```yaml
jobs:
  smoke:
    runs-on: ubuntu-latest
    env:
      NODE_ENV: production
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      ADMIN_EMAIL: ${{ vars.ADMIN_EMAIL }}
      ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
      ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd 9-HuggingFace-Global && npm ci && npm run db:migrate
```

### Hugging Face Spaces

`Space → Settings → Variables and secrets`.

- **Secrets** for the sensitive set.
- **Variables** for the non-sensitive set.

Hugging Face Spaces persists `/data` between restarts on most Space hardware tiers, so the SQLite fallback works there if you choose not to use Postgres. With `DATABASE_URL` set, the Space writes to Postgres and the on-disk SQLite at `/data/medos.db` is unused.

Sample `space.yml` extract:

```yaml
emoji: 🩺
sdk: docker
app_port: 7860
secrets:
  - DATABASE_URL
  - ADMIN_PASSWORD
  - ENCRYPTION_KEY
  - SMTP_PASS
variables:
  NODE_ENV: "production"
  ADMIN_EMAIL: "admin@medos.health"
  SMTP_HOST: "smtp.sendgrid.net"
  SMTP_PORT: "587"
  SMTP_USER: "apikey"
  FROM_EMAIL: "MedOS <noreply@your-domain>"
  APP_URL: "https://your-space.hf.space"
```

### Vercel

`Project → Settings → Environment Variables`.

- Tag every var for **Production** and **Preview** (you'll typically want a separate Neon database branch for Preview).
- The Neon connection string already includes `sslmode=require`; do not modify it.

You can also use Vercel's Neon integration to inject `DATABASE_URL` automatically per branch.

## Migration command

After setting env vars, run migrations once before the first request:

```bash
# Production (Postgres)
DATABASE_URL=postgresql://... npm run db:migrate

# Development (SQLite)
npm run db:migrate
```

The same `npm run db:migrate` works for both drivers. Migrations are version-gated and idempotent — running twice is safe.

## Connection-failure behavior

| Driver | Boot | First request | Mid-request |
|---|---|---|---|
| Postgres + `NODE_ENV=production` | Process exits 1 if connect fails (no silent fallback) | Same as boot | 503 response, structured log line |
| Postgres + `NODE_ENV=development` | Logs warning, falls back to SQLite | Reads from SQLite at `$DB_PATH` | Same |
| SQLite (dev only) | Always succeeds locally; fails only if path is unwritable | Reads from local file | n/a |

Production is always Postgres-required: when `NODE_ENV=production` and `DATABASE_URL` is missing or invalid, the server refuses to start. Silent fallback is convenient in development; it is a foot-gun in production, so we never enable it there.

## Rotating the database password

If a credential is ever exposed (e.g., pasted into a chat, a screenshot, or a logged URL), rotate immediately:

1. Neon → `Branches → production → Roles → Reset password` on the user.
2. Update `DATABASE_URL` in GitHub Actions secrets, HF Spaces secrets, and Vercel env vars.
3. Redeploy each platform so the new connection string takes effect.
4. Audit recent logins for the rotated role (Neon → `Operations`).

Plan for a quarterly rotation regardless of incident.

## Local development

```bash
cd 9-HuggingFace-Global
npm install
npm run dev
```

Without `DATABASE_URL` set, the app uses SQLite at `./medos.db`. The first request triggers the migration runner; verification codes show up on stdout because SMTP is unconfigured.

If you want to develop against Postgres locally, run a container:

```bash
docker run --name medos-pg -e POSTGRES_PASSWORD=devpass -p 5432:5432 -d postgres:16
export DATABASE_URL="postgresql://postgres:devpass@localhost:5432/postgres"
npm run db:migrate
npm run dev
```

## Cross-references

- `9-HuggingFace-Global/lib/db-adapter/` — implementation.
- `9-HuggingFace-Global/lib/db-adapter/migrations/` — schema definitions.
- `SECURITY.md` (repo root) — credential reporting and rotation policy.
- `THREAT_MODEL.md` (repo root) — assets, including DB credentials.
- `PRIVACY.md` (repo root) — what data lives in the DB and how it is retained / deleted.
