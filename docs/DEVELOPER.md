# Maple Quotations — Developer Guide

A standalone Next.js 16 app for building furniture quotations. Extracted from the
`maple-suite` monorepo; runs on its **own Postgres database** and its **own login**, with
no dependency on the suite.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript (strict) |
| DB / ORM | Postgres + Prisma 6 |
| Styling | Tailwind CSS v4 (theme via CSS variables) |
| Auth | Stateless JWT (`jose`) in an `mt_session` cookie |
| PDF | `@react-pdf/renderer` (client-side) |
| Excel import | `xlsx` + `jszip` |
| Tests | Vitest (unit) — see [TESTING.md](./TESTING.md) |

## 2. Getting started

```bash
# Postgres (its own DB)
docker run --name maple-pg -e POSTGRES_PASSWORD=maple -e POSTGRES_DB=maple_quotations -p 5544:5432 -d postgres:16
#   …or Homebrew: createdb maple_quotations

cp .env.example .env      # set DATABASE_URL + AUTH_SECRET
npm install               # also runs `prisma generate`
npm run db:push           # create the schema
npm run db:seed           # seed admin@maplefurnishers.com / maple@123
npm run dev               # http://localhost:3000
```

## 3. Project structure

```
app/
  layout.tsx              root layout; renders the shell for authed users, bare for /login
  page.tsx                the quotation builder (one big client component)
  pdf-catalog.tsx         the React-PDF document
  login/page.tsx          local sign-in form
  api/
    auth/login|logout     session cookie set/clear
    brand                 GET current brand (logo/name) for the host
    quotations            GET list · POST upsert (creates/links a client)
    quotations/[id]       DELETE (tenant-guarded)
middleware.ts             auth gate: verifies the cookie, redirects to /login
src/
  lib/                    vendored shared code (was @maple/core/lib)
    utils.ts              computeTotals + money/discount helpers  ← core business logic
    types.ts              QuoteData/QuoteItem/TotalsResult shapes
    session.ts            sign/verify the mt_session JWT
    rbac.ts               canAccessTool / can(action)
    tenant-db.ts          Prisma client auto-scoped to the request's tenant
    tenant.ts, brand.ts   resolve tenant/brand from session or host
    clientLink.ts         findOrCreateClient
    flags.ts              isEnabled() (Flipt, fail-open)
    auth.ts               getSession / hash / verify password
  components/
    ui/                   Button, Input, Card, Badge, Label (was @maple/core/ui)
    SuiteShell.tsx        minimal local header (replaced the suite's cross-tool sidebar)
    ToolDisabled.tsx
  db/index.ts             Prisma client singleton
prisma/
  schema.prisma           OWN schema: Tenant, User, Client, Quotation, OutboxEvent
  seed.mjs                first tenant + admin user
tests/unit/               Vitest specs
docs/                      this folder
```

### Why the `@maple/core/*` imports still exist
`app/` still imports from `@maple/core/lib/...` and `@maple/db`. Those are **not** the
monorepo packages — `tsconfig.json` `paths` remap them onto the vendored copies under
`src/`. Keeping the import strings identical minimized churn during extraction. If you
prefer, you can rewrite them to relative/`@/` imports later; nothing external depends on them.

## 4. How the core pieces work

### Auth & sessions
- Login (`POST /api/auth/login`) checks the `User` table (bcrypt) and signs a JWT with
  `AUTH_SECRET`, stored in the `mt_session` cookie.
- `middleware.ts` runs on every non-public route: verifies the cookie, else redirects to
  `/login`; also checks `canAccessTool(perms, "quotations", role)`.
- The JWT claim shape is `{ sub, name, email, role, perms[], tid }` — **identical to the
  suite**, so if this app is ever hosted on `*.maplefurnishers.com` with the suite's
  `AUTH_SECRET` and `COOKIE_DOMAIN=.maplefurnishers.com`, SSO works with no code change.

### Multi-tenancy
- Every scoped row carries a `tenantId`. `tenantDb()` returns a Prisma client that
  auto-filters reads and auto-stamps writes (`create` **and** `upsert`) with the current
  tenant. Always use `tenantDb()` in API routes, never the raw `prisma` client.
- The tenant is resolved from the session (`tid`) or, for public routes, from the host.

### The quote model
- A quote's full editable state (`QuoteData`) lives in the browser and is persisted as a
  single `Json` column (`Quotation.data`). Only summary fields (`number`, `total`, `status`,
  `clientId`) are first-class columns for listing/joining.
- `computeTotals(data)` (in `src/lib/utils.ts`) is the single source of truth for all money
  math: item → room → overall discounts, packing, loading, GST (inclusive/exclusive,
  split CGST/SGST). It's pure and fully unit-tested.

## 5. Common tasks

**Change the quote math** → edit `src/lib/utils.ts` (`computeTotals`), update
`tests/unit/totals.test.ts`, `npm test`.

**Add a field to a saved quotation** → edit `prisma/schema.prisma`, `npm run db:push`,
then read/write it in `app/api/quotations/route.ts`.

**Add a new API route** → create `app/api/<name>/route.ts`; use `tenantDb()` for data and
rely on `middleware.ts` for auth (routes under `/api` return 401/403 automatically).

**Add a user / role** → insert into `User` (hash the password with `hashPassword`); set
`perms` (`["*"]` = admin, or `["tool:quotations", "act:export", ...]`).

## 6. Ecosystem seams (for later)

This app is built to rejoin a multi-module ecosystem without a rewrite:
- **`Quotation.clientSnapshot`** — a frozen client copy at quote time, so rendering never
  needs a live cross-DB join. `clientId` is the stable global reference to the CRM's client.
- **`OutboxEvent`** — an outbox table for async events (e.g. emit `quotation.accepted` for
  an orders module). No producer/consumer yet; the table exists so wiring is cheap.
- **Versioned API** — expose cross-module reads under `app/api/v1/…` returning DTOs, never
  raw Prisma rows.

## 7. Deploy notes
- Set `AUTH_SECRET` (32-byte hex), `DATABASE_URL`, and — if on the suite domain —
  `COOKIE_DOMAIN=.maplefurnishers.com` + `LOGIN_URL`.
- `npm run build` → `npm start`. Run `prisma migrate deploy` (or `db push`) against prod.
- Next 16 note: `middleware.ts` is deprecated in favor of `proxy.ts` — a cosmetic rename
  when convenient.
