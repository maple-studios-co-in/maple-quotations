# Maple Quotations — Testing

## Running tests

```bash
npm test            # run the unit suite once (vitest run)
npm run test:watch  # watch mode
npm run test:coverage  # coverage report (src/lib/**)
```

## What's covered today

**Unit tests (Vitest)** — `tests/unit/`. The priority is the money math, which is pure and
the highest-risk logic in the app:

- `totals.test.ts` — `computeTotals` and the discount/format helpers:
  - flat & percent discounts, clamping, non-negative flooring
  - item → room → overall discount ordering
  - GST excluded vs inclusive, CGST/SGST split
  - packing (%) + loading (flat) charges
  - the summary `lines` always end with the grand total
  - INR formatting (`money`)

15 assertions, ~150 ms. These run with no database and no browser.

## The testing pyramid (target)

```
        ╱ E2E ╲          few — full login→build→save→PDF flows (Playwright)
      ╱─────────╲
    ╱ integration ╲      some — API routes against a test Postgres
  ╱─────────────────╲
 ╱     unit tests     ╲  many — computeTotals & helpers (done)
```

### Layer 1 — Unit (in place)
Pure functions in `src/lib/utils.ts`. Add a case here whenever you change the quote math.
Fast, deterministic, no I/O. **This is the first place to add tests.**

### Layer 2 — Integration (recommended next)
Test the API routes (`/api/quotations`, `/api/auth/login`) against a **throwaway Postgres**:

1. Spin a disposable DB (Docker or [Testcontainers](https://testcontainers.com/)), point
   `DATABASE_URL` at it, run `prisma db push` + seed in a setup file.
2. Exercise the route handlers, asserting tenant scoping (a row saved under tenant A must
   not appear for tenant B) and the `upsert` client-linking path.
3. This would have caught the two bugs found during extraction (the `/login` redirect loop
   and `upsert` not stamping `tenantId`).

Suggested: a `tests/integration/` folder with its own vitest project and a global setup
that provisions the DB.

### Layer 3 — E2E (for critical journeys)
Use **Playwright** for the handful of flows that must never break:

```bash
npm i -D @playwright/test && npx playwright install chromium
```

`e2e/quote.spec.ts` (sketch): sign in → add a room + item → **Save** → confirm it appears
under **Saved** → **Generate PDF** opens a new tab. Run against `npm run build && npm start`
with a seeded test DB. Keep E2E few — they're slow and brittle; push coverage down to units.

## Conventions
- Name specs `*.test.ts` (unit/integration) and `*.spec.ts` (e2e).
- A test must not depend on another test's state or on wall-clock time — pass fixed dates
  into `QuoteData` rather than reading `Date.now()`.
- When you fix a bug, add the failing case first, then the fix (regression test).

## CI (suggested)
A GitHub Actions job on every PR: `npm ci` → `npm run build` → `npm test`. Add a Postgres
service container once integration tests land.
