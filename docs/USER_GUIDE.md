# Maple Quotations — User Guide

Build furniture proposals room by room, import whole catalogs with AI, and send a
branded PDF or the rate-sheet workbook your team already uses.

---

## Signing in

Open the app (locally **http://localhost:3000**, or your hosted URL) and sign in.
The default admin is **admin@maplefurnishers.com / maple@123** — change it after first
login. Signed-out visitors see the public landing page; **Read the docs** works without
an account.

## The screen at a glance

- **Top bar** — quote number, Undo/Redo, Templates, Share, Save draft, Save,
  **Export sheet**, **Generate PDF**.
- **Tabs** — Overview · Rooms & Items · Finance & T&C · Settlement · Drafts · Saved.
- **Right panel** — live financial summary and a live proposal preview.
- **Header** — your company logo, Library, Settings (admins), Sign out.

## Building a quote

### 1. Overview
Client details (name, phone, project address) and proposal configuration (quote number,
date, validity, sales executive, site name).

### 2. Rooms & Items
Quotes are organised by room. **+ Create room**, rename inline, then fill it:

- **+ Item** — blank line: category, description, material, fabric, unit rate, unit
  (NOS/SET/SQFT/RFT), unit value, quantity. Totals update live.
- **Quick add template…** — common pieces (wardrobe, kitchen, sofa…).
- **+ Library** — pick from your **product library**: everything you've imported or
  saved before, each with a product code (like `MF-P-0042`), its last rate,
  specification, and photo. Search by name, code, or category, tick several, and
  add them to the room in one go.
- **Import Excel** — reads an .xlsx rate sheet, including embedded images.
- **Import catalog (AI)** — see the next section.

**Item photos** — hover the image square on any item:
- **FILE** — upload from your computer
- **LINK** — paste an image URL
- **GALLERY** — pick from the shared image gallery (all previously saved product
  photos). You can also upload into and delete from the gallery there.

**Room discount** — flat ₹ or % per room, applied after item discounts.

### 3. Import catalog (AI)

Turns a whole project catalog PDF into quote rooms in minutes.

1. Click **Import catalog (AI)** and upload the **rates catalog** — the scanned pages
   with handwritten rates are fine; the AI understands "85K", "18K per pc",
   crossed-out corrections, and "Pending".
2. Optionally add the **clean client PDF** (the original without handwriting) — item
   photos are then cropped from the clean pages instead of the scan, so they look
   much better on the proposal.
3. Click **Parse catalog**. Large catalogs take a few minutes; keep the tab open.
4. **Review screen** — every item shows its photo, dimensions, an editable rate and
   quantity. Rows highlighted amber need your attention: the rate was missing,
   marked "Pending", or the handwriting was ambiguous. Fix or remove them —
   **nothing enters the quote unreviewed**.
5. **Add to quote** — the rooms land in your quotation, and every item is also saved
   to the **product library** automatically (with its photo), so the next quote can
   pull it from **+ Library** instead of re-importing.

### 4. Finance & T&C
Global discount (₹/%), GST rate with **Extra** or **Inclusive** mode, optional
**CGST + SGST split** for intra-state billing, packing %, loading ₹, and the editable
terms list.

### 5. Settlement
UPI ID and bank details that print on the proposal.

## Saving your work

- **Autosave** — your working quote is kept in the browser and restored next visit.
- **Save draft** — named snapshots, local to your browser (Drafts tab).
- **Save** — stores the quote in the system, linked to the client (Saved tab; visible
  to the team, survives any device). Load or delete from there.
- **Share** — copies a link that opens this exact quote for a signed-in colleague.

## Sending it

- **Generate PDF** — a branded proposal: your banner and logo on the first page, the
  company block (address, phone, email, GSTIN, website), rooms with item photos, the
  full financial breakdown, terms, payment details, and your tagline in the footer.
- **Export sheet** — an .xlsx in the team's rate-sheet format: items grouped under
  room headers with the Subtotal / Packing / Loading / GST / TOTAL block at the end.

## The Library page

The **Library** link in the header opens the management view for everything the
pickers use:

- **Products tab** — search all saved products (by code, name, category, spec),
  create one manually with **+ New product** (name, category, spec, material, unit,
  default rate, photo), edit any field, or delete. Deleting a product never touches
  quotes that already used it.
- **Gallery tab** — the shared image collection: upload images (multi-select),
  search by name, delete. AI catalog imports add product photos here automatically.

## Settings (admins)

The **Settings** link in the header:

- **Branding & company** — upload your **logo** and **PDF banner**, set the brand
  color, and fill the company details (name, address, phone, email, GSTIN, website,
  tagline). These drive the app header, the proposal PDF, and the previews.
- **AI configuration** — the Anthropic API key (stored encrypted, always shown
  masked) and the parsing model. Handwritten rates read best on the most capable
  models; Sonnet is fine for clean text PDFs.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Ctrl/⌘ + S | Save draft |
| Ctrl/⌘ + P | Generate PDF |
| Ctrl/⌘ + Z | Undo |
| Ctrl/⌘ + Shift + Z | Redo |

## Tips

- Give the AI import the clean client PDF too whenever you have it — the proposal
  photos come out far sharper.
- Amber rows in the AI review are the ones that cost money if wrong. Check them
  against the paper before adding.
- The product library remembers the **latest** rate for a repeated item — re-importing
  a catalog updates rates rather than duplicating products.
- PDF amounts print as "Rs" (the PDF fonts have no ₹ glyph); the app itself shows ₹.
