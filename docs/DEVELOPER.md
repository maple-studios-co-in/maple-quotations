# Maple Quotations — Developer Guide

A standalone Next.js 16 app for building furniture quotations, with AI catalog
parsing, a product library, and branded PDF output. Extracted from the `maple-suite`
monorepo; runs on its **own Postgres database** and its **own login**.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript (strict) |
| DB / ORM | Postgres + Prisma 6 |
| Styling | Tailwind CSS v4 (theme via CSS variables) |
| Auth | Stateless JWT (`jose`) in an `mt_session` cookie |
| AI | `@anthropic-ai/sdk` — catalog PDFs parsed via Claude vision + structured output |
| PDF | `@react-pdf/renderer` (client-side; also renderable in Node via `scripts/`) |
| Images | `pdf-to-img` + `sharp` (server-side page render + crop); assets stored in Postgres |
| Excel | `xlsx` + `jszip` (import and rate-sheet export) |
| Tests | Vitest — see [TESTING.md](./TESTING.md); manual pass: [REGRESSION.md](./REGRESSION.md) |

## 2. Getting started

```bash
docker run --name maple-pg -e POSTGRES_PASSWORD=maple -e POSTGRES_DB=maple_quotations -p 5544:5432 -d postgres:16
cp .env.example .env      # DATABASE_URL, AUTH_SECRET; ANTHROPIC_API_KEY for AI parsing
npm install               # runs prisma generate
npm run db:push && npm run db:seed   # admin@maplefurnishers.com / maple@123
npm run dev
```

## 3. Project structure

```
app/
  layout.tsx               shell for authed users, bare children for /login + landing
  page.tsx                 signed in -> builder, signed out -> landing
  landing.tsx              public landing page
  builder.tsx              the quotation builder (client component)
  pdf-catalog.tsx          MasterProposalPdf — the branded react-pdf document
  catalog-import.tsx       AI import modal (two PDF slots -> review -> add to quote)
  product-picker.tsx       "+ Library" modal (search saved products, add to room)
  gallery-picker.tsx       image gallery modal (browse/upload/select/delete)
  login/                   server page (redirects authed users) + client form
  settings/                admin settings: AI config + branding & company
  docs/                    public docs site rendering /docs/*.md
  api/
    auth/login|logout      session cookie set/clear
    brand                  GET full brand/company profile for the request host
    quotations, quotations/[id]   quote CRUD (tenant-scoped)
    settings               admin GET/PUT: AI settings + company profile
    assets, assets/[id]    upload/list + serve/delete stored images
    products, products/[id], products/bulk   product library CRUD + AI bulk upsert
    ai/parse-catalog       PDF -> vision parse -> normalized rooms/items (+ photos)
middleware.ts              auth gate; public: /, /login, /docs, /api/auth
src/
  lib/
    utils.ts               computeTotals + money helpers  <- core business logic (unit-tested)
    types.ts               QuoteData/QuoteItem/TotalsResult
    catalog-parse.ts       Claude vision calls: parse rates PDF, locate photos in clean PDF
    pdf-images.ts          render PDF pages (pdf-to-img) + crop item photos (sharp)
    assets.ts              createAsset(FromDataUrl), nextProductCode (MF-P-XXXX)
    settings.ts            runtime settings: DB (AES-GCM encrypted secrets) -> env -> default
    sheet-export.ts        rate-sheet .xlsx in the team's format
    brand.ts               getBrand(): tenant branding/company by host, first-tenant fallback
    session.ts, auth.ts, rbac.ts, tenant.ts, tenant-db.ts   auth + multi-tenancy
  components/              SuiteShell (header), ui kit (button/input/card/badge/label)
  db/index.ts              Prisma client singleton
prisma/schema.prisma       OWN schema: Tenant, User, Client, Quotation, AppSetting,
                           Asset, Product, Counter, OutboxEvent
scripts/render-pdf-sample.tsx   render the proposal PDF outside the browser (design iteration)
docs/                      these guides, served at /docs
```

The `@maple/core/*` and `@maple/db` imports are tsconfig `paths` aliases onto `src/`
(vendored from the old monorepo) — nothing external.

## 4. How the core pieces work

### Auth & multi-tenancy
JWT (`{sub, name, email, role, perms[], tid}`) signed with `AUTH_SECRET` in the
`mt_session` cookie; `middleware.ts` gates everything except the public routes. Use
`tenantDb()` for models in its SCOPED list; `Asset`/`Product` are stamped/filtered
manually with `getTenantId()`.

### The quote model
A quote's editable state (`QuoteData`) lives in the browser and persists as one JSON
column. `computeTotals()` in `src/lib/utils.ts` is the single source of truth for all
money math — item → room → overall discounts, packing, loading, GST inclusive/exclusive,
CGST/SGST split. Pure and unit-tested; change it only with tests.

### AI catalog parsing (`src/lib/catalog-parse.ts`)
The rates PDF goes to the Claude API as a native base64 document block with a
structured-output JSON schema — no rasterization for parsing. The prompt encodes the
domain's handwriting conventions ("K" = ×1000, "per pc", crossed-out rewrites,
"Pending"). Each item also returns a photo bounding box (page + percent coords).
Requests stream (multi-minute parses) and, on `claude-fable-5`, opt into the
server-side fallback to Opus 4.8 for rare safety false-positives. A second, optional
pass locates the same items' photos in the clean client PDF. `pdf-images.ts` renders
only the needed pages and crops thumbnails with sharp into small JPEG data URLs.
Model + API key come from `settings.ts` (DB overrides env). Image failures degrade to
a photo-less parse, never a failed import.

### Product library & gallery
`POST /api/products/bulk` upserts reviewed AI-import items (dedupe on
case-insensitive name + specification; existing rows get the newest rate and a photo
if missing). Codes come from `nextProductCode()` (a `Counter` row → `MF-P-0001`…).
Photos are `Asset` rows (kind `product`) — the same table backs brand images (`logo`,
`banner`) and is served by `/api/assets/[id]` with immutable caching. Pickers convert
selected assets to data URLs client-side so the existing item-image + PDF pipeline is
unchanged.

### Branding & the PDF
`getBrand()` resolves the tenant by host, falling back to the first tenant (so
standalone/localhost shows real branding), and returns the full company profile.
`onGeneratePdf` fetches it, converts logo/banner to data URLs, and renders
`MasterProposalPdf` client-side. The PDF uses built-in Times/Helvetica — the ₹ glyph
isn't encodable there, so amounts print as "Rs". Iterate on the design without a
browser: `npx tsx scripts/render-pdf-sample.tsx [logo.png] [banner.png] [out.pdf]`.

## 5. Common tasks

**Change quote math** → `src/lib/utils.ts` + a case in `tests/unit/totals.test.ts`.
**Tune AI parsing** → prompt/schema in `src/lib/catalog-parse.ts`; test cheaply with a
3-page `pdfseparate` slice via `POST /api/ai/parse-catalog`.
**Change the PDF** → `app/pdf-catalog.tsx`, verify with the render script + `pdftoppm`.
**Add a settings value** → `SETTING_DEFS` in `src/lib/settings.ts` (secrets encrypt
automatically) + the settings API/form.
**Add a DB field** → `prisma/schema.prisma`, `npm run db:push`.

## 6. Configuration

```bash
DATABASE_URL=...                 # required
AUTH_SECRET=...                  # required; also enables suite SSO if shared
ANTHROPIC_API_KEY=sk-ant-...     # fallback; Settings page (DB, encrypted) overrides
AI_PARSE_MODEL=claude-fable-5    # fallback; Settings page overrides
# optional: LOGIN_URL, COOKIE_DOMAIN, FLIPT_URL (see .env.example)
```

## 7. Deploy notes

- `npm run build` → `npm start`; run `prisma db push` (or migrations) against prod.
- `next.config.ts` marks `sharp`, `pdf-to-img`, `@napi-rs/canvas` as
  `serverExternalPackages` — native modules; the deploy image must be able to install
  them (standard Node Alpine/Debian images are fine).
- Set the AI key either as env or once via Settings (stored AES-GCM encrypted,
  keyed off `AUTH_SECRET` — changing `AUTH_SECRET` invalidates stored secrets).
- Assets (logos, product photos) live in Postgres — include the DB in backups; move
  to object storage when volume grows (roadmap).
- `middleware.ts` uses the deprecated-but-working `middleware` convention; Next 16
  suggests renaming to `proxy.ts` eventually.
