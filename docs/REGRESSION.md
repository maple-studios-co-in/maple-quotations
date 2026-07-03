# Regression Test Plan

A full manual pass for another developer to verify the app end to end. Run it before
any release, after dependency upgrades, or after touching shared code (`src/lib`,
`prisma/schema.prisma`, `middleware.ts`).

**Time budget:** ~45 minutes without the AI suites, ~60 with them.
**Record results** as a copy of the checklist with pass/fail + notes per item; file
issues for failures with the suite number (e.g. "R5.3").

---

## 0. Environment setup

```bash
# Postgres up (Docker on :5544 or local on :5432) with a database
cp .env.example .env            # set DATABASE_URL; AI suites also need ANTHROPIC_API_KEY
npm install
npm run db:push && npm run db:seed
npm run dev                     # http://localhost:3000
```

Automated gates first — all must pass before manual testing:

```bash
npm test          # 15 unit tests (quote math)
npm run build     # typecheck + production build
npx tsx scripts/render-pdf-sample.tsx   # renders /tmp/mq-proposal-sample.pdf without a browser
```

Seed login: `admin@maplefurnishers.com` / `maple@123`.
For the AI suites (R7) you need a catalog PDF; a 3-page slice keeps cost low:
`pdfseparate -f 1 -l 3 catalog.pdf /tmp/p-%d.pdf && pdfunite /tmp/p-*.pdf /tmp/slice.pdf`.

---

## R1 — Auth & access

| # | Step | Expected |
|---|---|---|
| 1 | Open `/` signed out | Public landing page (no redirect) |
| 2 | Open `/docs` signed out | Docs hub renders, scrollable |
| 3 | `POST /api/quotations` signed out (curl) | 401 |
| 4 | Login with wrong password | Inline error, stays on /login |
| 5 | Login with seed credentials | Redirects to builder |
| 6 | Visit `/login` while signed in | Redirects to `/` |
| 7 | Visit `/docs` while signed in | Renders inside app shell, scrolls |
| 8 | Sign out | Back to landing/login; builder inaccessible |
| 9 | 9 wrong passwords in a row | 429 "Too many failed attempts"; works again after ~15 min |
| 10 | Open `/login?next=https://example.com`, sign in | Lands on `/` (never an external site) |

## R2 — Quote builder core

| # | Step | Expected |
|---|---|---|
| 1 | Switch all six tabs | Content changes, active tab underlined |
| 2 | Overview: fill client name/phone/address | Right-panel preview appears |
| 3 | Rooms: create room, rename inline, add item | Live totals update |
| 4 | Item: rate 1000, qty 2, unit NOS | Line total ₹2,000 |
| 5 | Room discount 10% | Summary shows "Less: Room discounts"; net updates |
| 6 | Finance: GST 18% split CGST/SGST | Two 9% lines; totals correct |
| 7 | Finance: GST mode "Inclusive" | Grand total unchanged from pre-tax amount; GST backed out |
| 8 | Packing 3% + loading ₹500 | Both lines appear and add up |
| 9 | Ctrl+Z / Ctrl+Shift+Z | Undo/redo item edits |
| 10 | "Templates" → apply one | Rooms replaced after confirm |
| 11 | Reload the page | Working quote restored from browser storage |
| 12 | "Share" → open copied link in a private window + sign in | The shared quote loads, including edited T&C; item photos are intentionally not in the link |
| 13 | "Share" with a client name in Hindi/any script | Link copies and loads correctly (no crash) |
| 14 | "+ Item" on a room | New item starts at Qty 1 and its row total matches the summary |
| 15 | Edit Terms & Conditions, reload the page | Custom terms persist (not reset to defaults) |

## R3 — Persistence: drafts, saved, exports

| # | Step | Expected |
|---|---|---|
| 1 | "Save draft" with a name | Appears under Drafts tab; survives reload |
| 2 | Delete a draft | Removed after confirm |
| 3 | "Save" (client name set) | Toast; appears under Saved with client name + total |
| 3b | Tampered save (curl with total=1, items worth more) | Stored total is recomputed from the items, not the client's number |
| 4 | "Save" again with same quote number, same client | Updates the same row (no duplicate) |
| 4b | "Save" the same quote number with a DIFFERENT client name | Clear 409 error naming the other client; nothing overwritten |
| 5 | Saved → Load | Quote loads into builder, including its saved T&C |
| 6 | Saved → delete | Row disappears |
| 7 | "Export sheet" | .xlsx downloads: CATEGORY…TOTAL columns, room header rows, summary block (Subtotal / Packing / Loading / CGST+SGST or GST / TOTAL) matching the on-screen totals |

## R4 — Settings (admin)

| # | Step | Expected |
|---|---|---|
| 1 | Header shows "Settings" link (admin only) | Opens /settings |
| 2 | AI: current key shows masked (••••xxxx) | Never the full key |
| 3 | AI: save a bad key ("foo") | Rejected with error |
| 4 | AI: switch model, save, reload | Selection persists |
| 5 | Branding: upload a logo image | Preview appears; app-header logo updates |
| 6 | Branding: upload a banner | Wide preview appears |
| 7 | Company fields: edit address/phone/GSTIN/website/tagline, save | Toast; reload shows saved values |
| 8 | Remove logo | Header falls back to text brand name |
| 9 | `GET /api/settings` as non-admin (create a sales user) | 403 |

## R5 — PDF proposal

Set branding + company first (R4), build a quote with 2 rooms and at least one item photo.

| # | Step | Expected |
|---|---|---|
| 1 | "Generate PDF" | New tab opens with the PDF |
| 2 | First page | Banner across top, logo, company block (name, both address lines, phone·email, GSTIN, website), PROPOSAL title, two cream cards (client / reference) |
| 3 | Rooms | Brand-red band per room with item count; rows show photo thumbnails, name, spec, qty × rate, line total; room net at the band's end |
| 4 | Totals | Right-aligned block; discounts/packing/loading/GST lines match on-screen summary; Grand Total in brand color. Amounts show "Rs" (known: no ₹ glyph in built-in PDF fonts) |
| 5 | Terms + payment | Numbered terms; payment card with UPI/bank fields |
| 6 | Footer on every page | website · tagline · "Page N of M" |
| 7 | Remove banner + logo in Settings, regenerate | PDF still renders using text fallbacks (no crash, no blank header) |
| 7b | Add an item image via LINK to an external site, generate | PDF renders (that image may be dropped); on failure a clear error toast appears |
| 7c | Generate with the browser's popup blocker on | PDF downloads as a file instead, with a toast |
| 8 | Live preview panel | Mirrors the same design and shows YOUR company name/address/color from Settings |

## R6 — AI catalog import (needs API key; costs a few ₹ per run)

| # | Step | Expected |
|---|---|---|
| 1 | Rooms & Items → "Import catalog (AI)" | Modal with two upload slots + disabled Parse button |
| 2 | Choose rates PDF only → Parse | Spinner with "can take minutes" note; then review screen |
| 3 | Review screen | Rooms grouped; each item: thumbnail, name, dims, editable ₹/pc + qty, computed total; pending/low-confidence rows highlighted amber with badges |
| 4 | Items with no written rate | Rate empty + flagged, NOT invented |
| 5 | Edit a flagged rate | Highlight clears; totals update |
| 6 | Remove an item | Row disappears from import |
| 7 | "Add to quote" | Rooms append to the quote; toast; second toast "Saved to product library (N new, M updated)" |
| 8 | Re-run the same import → Add | Library toast reports mostly "updated", not duplicates |
| 9 | Two-PDF mode: rates PDF + clean PDF | Photos noticeably cleaner (from the clean file); items still carry scan rates |
| 10 | Upload a non-PDF | Friendly 400 error, modal stays usable |
| 11 | Remove API key (Settings + env), try parse | 503 "No Anthropic API key configured" |

## R7 — Product library

| # | Step | Expected |
|---|---|---|
| 1 | After R6.7: room header → "+ Library" | Modal lists saved products: thumbnail, MF-P-XXXX code badge, name, spec, rate |
| 2 | Search by partial name ("chair") | Filtered results |
| 3 | Search by code (e.g. MF-P-0003) | Exact product found |
| 4 | Select 2 products → "Add to room" | Items appear in that room with rate, spec, and photo |
| 5 | `GET /api/products?q=` via curl (authed) | JSON list with codes, imageUrl fields |
| 6 | Header → **Library** → Products tab | All saved products listed with code, image, rate |
| 7 | "+ New product": name + spec + rate + image, save | Appears in list with a fresh MF-P code |
| 8 | Edit a product's rate, save | Row updates; "+ Library" picker in the builder shows the new rate |
| 9 | Delete a product | Removed after confirm; existing quotes unaffected |

## R8 — Image gallery

| # | Step | Expected |
|---|---|---|
| 1 | Hover an item's image square → GALLERY | Gallery modal: grid of saved product images |
| 2 | Upload an image inside the gallery | Appears in the grid |
| 3 | Click an image | Sets that item's photo; shows in preview + PDF |
| 4 | Hover a gallery tile → ✕ | Asset deleted after confirm/refresh |
| 5 | Search gallery by name | Grid filters |
| 6 | Library → Gallery tab: upload (multi-select) | Images appear in the grid |
| 7 | Gallery tab: delete an image | Gone from grid; linked product falls back to no image |

## R9 — Landing & docs content

| # | Step | Expected |
|---|---|---|
| 1 | Signed out `/`: hero, steps, bento, sheet table, CTAs | All sections render; both CTAs work |
| 2 | `/docs`: all guides open | User Guide, Developer, Testing, Auto-Generation, Regression, Roadmap render with formatting |
| 3 | Mobile width (~380px) | Landing and builder collapse without horizontal scroll |

---

## Known limitations (do not file as bugs)

- Share links carry the quote content but not embedded item photos (links stay small); use Save for the full quote.

- PDF amounts use "Rs" not "₹" (built-in PDF font limitation).
- Item images are embedded data URLs inside the quote JSON; large imports make saved quotes heavy (roadmap: object storage).
- `getBrand()` on a host that matches no tenant falls back to the first tenant.
- Assets and products are tenant-scoped; the empty-database brand fallback is "Maple Furnishers".
