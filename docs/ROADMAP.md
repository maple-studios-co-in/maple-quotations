# Maple Quotations — Enhancements & Roadmap

Concrete, code-grounded improvements, roughly in priority order. Each notes the file(s) it
touches.

---

## P0 — Correctness & security (do first)

1. **Server-side, atomic quote numbers.** Today the number is a random client value
   (`MF/2026/Q-${random}` in `app/page.tsx`) — collisions and gaps are possible, and it's
   not sequential. Generate it server-side per tenant (a `Counter` row or a Postgres
   sequence) inside the save transaction.
2. **Validate the API payload.** `POST /api/quotations` accepts `b.data` as an opaque blob
   and trusts `total` from the client. Add a `zod` schema for `QuoteData`, and recompute
   `total` server-side with `computeTotals` so the stored total can't be spoofed.
3. **Enforce actions in RBAC.** `DELETE /api/quotations/[id]` only checks tool access, not
   `act:delete`; export isn't gated either. Wire `can(perms, "delete"/"export")` from
   `src/lib/rbac.ts` into those handlers.
4. **Harden login.** Add rate-limiting / lockout on `POST /api/auth/login`, enforce a real
   `AUTH_SECRET` (fail fast if it's the insecure default in production), and add password
   reset + change. Consider session revocation (a `tokenVersion` claim).

## P1 — Product features

5. **Quote lifecycle + emit the event.** Replace the free-text `status` with a real workflow
   (`draft → sent → accepted → rejected → expired`). On `accepted`, write an
   `OutboxEvent("quotation.accepted", …)` — the seam already exists in the schema. This is
   the first real ecosystem hook (orders module consumes it).
6. **Populate `clientSnapshot`.** The column exists but isn't filled. On save, freeze
   `{name, phone, gstin, address}` into `Quotation.clientSnapshot` so a quote always renders
   its client even if the CRM record later changes.
7. **Convert quote → order/invoice.** A one-click handoff that carries the snapshot + line
   items forward. Natural once #5 lands.
8. **Move item images off base64.** Images are stored as data-URLs inside the `data` JSON —
   this bloats DB rows, the share link, and PDF memory. Upload to object storage (S3/R2) and
   store URLs instead. Fixes the **share link size limit** too (large quotes currently
   exceed URL length because the whole quote is base64'd into the query string).
9. **Server-side share links.** Replace the `?q=<base64>` approach with a short token backed
   by a stored row (read-only public view). Smaller URLs, revocable, trackable.
10. **Saved list: search, filter, pagination.** `GET /api/quotations` currently returns every
    row. Add `?q=&status=&page=` and server-side paging as volume grows.
11. **Sync drafts to the server (optional).** Drafts are `localStorage`-only today — lost on
    browser clear or another device. Offer opt-in server-backed drafts.
12. **Company profile settings.** The proposal header ("MAPLE FURNISHERS", address, phone) is
    hardcoded in `app/page.tsx`/`pdf-catalog.tsx`. Drive it from the `Tenant` row so branding
    is data, not code (logo already flows via `getBrand`).

## P2 — Platform & ecosystem

13. **CRM client sync.** Pull live clients from the CRM module via a versioned API instead of
    the local `Client` cache, keeping `clientId` as the shared key. Snapshot (#6) covers the
    offline-render case.
14. **`@maple/contracts` package.** Extract the shared JWT claim type + DTOs + event names
    into a tiny published package so quotations, CRM, and orders stay in lockstep without
    sharing a database.
15. **Server-side PDF + storage/versioning.** Optionally render PDFs server-side and store
    each generated version (audit trail, re-download, email attach).
16. **Email / WhatsApp send.** Send the proposal directly from the app (with the server-side
    PDF from #15).

## P3 — Quality, DX, ops

17. **Tests up the pyramid.** Add integration tests (API against a throwaway Postgres) and a
    couple of Playwright E2E flows — see [TESTING.md](./TESTING.md).
18. **CI.** GitHub Actions: `npm ci → build → test` on every PR; add a Postgres service once
    integration tests exist.
19. **Lint + format.** Add ESLint (Next config) + Prettier; wire into CI and a pre-commit hook.
20. **Observability.** Error tracking (Sentry), structured request logging, and a
    `/api/health` endpoint (DB ping) for uptime checks.
21. **Rename `middleware.ts` → `proxy.ts`.** Clears the Next 16 deprecation warning.
22. **Dockerfile + compose** for one-command deploy of the app + its Postgres.
23. **Accessibility & i18n.** Audit the builder for keyboard/screen-reader use; externalise
    strings if multi-language is ever needed.

## P4 — Analytics (later)

24. **Pipeline dashboard.** Conversion rate (sent → accepted), total quoted value, aging
    quotes, per-salesperson performance — straightforward once the lifecycle (#5) exists.

---

### Suggested first sprint
#1 (quote numbers) · #2 (payload validation) · #6 (clientSnapshot) · #5 (lifecycle +
event) · #21 (proxy rename) · #18 (CI). Together they close the biggest correctness gaps and
light up the first ecosystem seam.
