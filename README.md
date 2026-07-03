# Maple Quotations

Standalone quotations tool, extracted from `maple-suite`. Runs on its **own database**
and its **own login** — no dependency on the suite monorepo or the shared Postgres.

Next.js 16 (App Router) · Prisma · Postgres · React-PDF.

## Docs

- [Developer Guide](docs/DEVELOPER.md) — stack, structure, how the pieces work, common tasks
- [User Guide](docs/USER_GUIDE.md) — building quotes, PDF export, drafts vs saved, shortcuts
- [Testing](docs/TESTING.md) — running tests, the testing pyramid, adding coverage
- [Roadmap](docs/ROADMAP.md) — prioritised enhancements

## Run it locally

```bash
# 1. Postgres (its own DB). Docker:
docker run --name maple-pg -e POSTGRES_PASSWORD=maple -e POSTGRES_DB=maple_quotations -p 5544:5432 -d postgres:16
#    …or a local Homebrew postgres: createdb maple_quotations

# 2. Env
cp .env.example .env        # then set DATABASE_URL to match your Postgres

# 3. Install, create schema, seed the first user
npm install                 # also runs `prisma generate`
npm run db:push
npm run db:seed             # seeds admin@maplefurnishers.com / maple@123

# 4. Dev
npm run dev                 # http://localhost:3000  → sign in
```

## How it's structured

```
app/                    Next app (pages, API routes, /login)
src/lib/                vendored shared code (was @maple/core/lib)
src/components/ui/       vendored UI kit (was @maple/core/ui)
src/components/          SuiteShell (local, minimal) + ToolDisabled
src/db/                  Prisma client (was @maple/db)
prisma/schema.prisma     this tool's OWN schema
```

The old `@maple/core/*` and `@maple/db` imports still appear in `app/` — they resolve to
the vendored copies under `src/` via `tsconfig.json` `paths`. Nothing is fetched from the
monorepo.

### Auth
Stateless `mt_session` JWT (signed with `AUTH_SECRET`), same cookie format as the suite —
so if you ever deploy this on `*.maplefurnishers.com` with the suite's `AUTH_SECRET`, SSO
"just works". Standalone, it uses the local `/login` page against the `User` table.

## Ecosystem seams (already wired, no consumer yet)

This tool is built to rejoin a multi-module ecosystem later without a rewrite. See the
rules in `MAPLE-ECOSYSTEM-PLAN.md` (in the parent workspace). Concretely:

- **`Quotation.clientSnapshot`** — a frozen copy of the client at quote time, so this tool
  never needs a live cross-DB join to render a client. The canonical client lives in CRM;
  `clientId` is the stable global reference.
- **`OutboxEvent`** — an outbox table for future async events (e.g. emit `quotation.accepted`
  for the orders module to consume). No producer/consumer yet; the seam exists.
- **Versioned API** — when other modules need to read quotations, add `app/api/v1/…` routes
  returning DTOs (don't expose Prisma rows directly).

## What changed vs. the suite copy

- Removed workspace deps (`@maple/core`, `@maple/db`); vendored the required files into `src/`.
- Own `prisma/schema.prisma` (Tenant, User, Client, Quotation + `clientSnapshot`, OutboxEvent).
- Added local auth: `/login` page + `POST /api/auth/login`.
- Root layout no longer redirect-loops on `/login`; the shell wraps authed pages only.
- Replaced the cross-tool `SuiteShell` with a minimal local header.
- Fixed tenant scoping on `upsert` in `src/lib/tenant-db.ts` (saves now stamp `tenantId`).
