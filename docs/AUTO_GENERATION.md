# Auto-Generating Quotations from Catalog PDFs

The plan for turning a project catalog PDF into a ready-to-edit quotation, grounded in the
real inputs and output we work with.

---

## 1. The inputs and output, as they exist today

**Input A: the scanned rate catalog** (e.g. "Adobe Scan", 27 pages). One page per room
("405 - LIVING DINING KITCHEN", "405 - MASTER BEDROOM", ...). Each page is a grid of
items: a product photo, the item name, dimensions in mm, and quantity hints in the name
("DINING CHAIR x 8"). Rates are **handwritten** on the page: "85K", "114K.",
"18K per pc", "35K per pc", plus notes like "with marble", "SS backrests", and
"Pending" where a rate isn't final. There is no text layer; it's pure image.

**Input B: the clean spec PDF** (e.g. "405 furnitures", 36 pages). Same items with a real
text layer (name + dimensions extract cleanly), but no rates and no images we can trust
positionally.

**Output: the quotation sheet** (the team's Google Sheet format). Columns
`CATEGORY | IMAGE | DESCRIPTION | SPECIFICATION | UNIT | PRICE | QUANTITY | TOTAL`, items
grouped under room section rows, and a summary block: Subtotal, Packing Charge @3%,
Loading, GST @18%, TOTAL. This maps 1:1 onto the app's `QuoteData` model (rooms → sections,
charges → summary), and the app now exports exactly this via **Export sheet**.

So the job is: **PDF pages → structured rooms/items with rates → `QuoteData` → review →
save/export.** The last two steps already exist; we're building the first two.

## 2. Pipeline

```
Upload PDF ──► Rasterize pages ──► Vision parse (per page) ──► Normalize ──► Review UI ──► QuoteData
   (UI)         (server, pdfjs)      (Claude, structured)       (code)        (human)      (existing app)
```

### Step 1: Upload
`POST /api/ai/parse-catalog` accepts the PDF (multipart). Store it under a job id.

### Step 2: Rasterize
Render each page to a PNG at ~150 DPI (`pdfjs-dist` + `@napi-rs/canvas`, both already used
in maple-suite's core package). Scanned pages are images anyway; this also handles Input B
uniformly.

### Step 3: Vision parse (the AI step)
Send each page image to the Claude API with a structured-output schema:

```ts
{
  room: string,                      // "405 - LIVING DINING KITCHEN"
  items: [{
    name: string,                    // "DINING CHAIR"
    quantity: number,                // 8, parsed from "x 8"; default 1
    dimensions: string,              // "L 450 x W 450, Seat Ht 450, Backrest Ht 900 mm"
    rate: number | null,             // 18000 from "18K"; null when absent
    ratePerPiece: boolean,           // true for "18K per pc"
    notes: string[],                 // ["with marble", "SS backrests"]
    pending: boolean,                // handwritten "Pending" or crossed out
    confidence: "high" | "low"       // low → flag for human review
  }]
}
```

The prompt teaches the model the domain conventions we saw in the real scans: "K" means
×1000 rupees, "per pc" multiplies by the quantity, crossed-out values are superseded by
the adjacent rewrite, "Pending" means no rate yet.

Model: `claude-sonnet-5` (vision + structured output; a 27-page catalog costs roughly
a few rupees per run). Runs server-side with `ANTHROPIC_API_KEY` — never in the browser.

### Step 4: Normalize (plain code, no AI)
- `18K per pc` × qty 8 → price 18,000, quantity 8 (the app computes the line total).
- Dimensions string → `SPECIFICATION` column text.
- Room title → room name; item name → `CATEGORY`.
- Pending / low-confidence items get `price 0` and a flag.

### Step 5: Review UI (the trust step, non-negotiable)
A side-by-side screen: page image on the left, parsed rows on the right. The user
confirms or fixes each rate — especially the handwriting reads and "Pending" items —
then hits **Create quotation**. Handwriting OCR will not be 100%; the review step is what
makes this usable for real money.

### Step 6: Hand off to the existing builder
The confirmed structure becomes `QuoteData` rooms/items in the builder. From there,
everything already works: discounts, GST, PDF proposal, **Export sheet**.

## 3. Item images
Phase 2: while parsing, also ask the model for each item's bounding box on the page, crop
the product photo out of the page PNG, and attach it as the item image (the PDF proposal
already renders item images). Until then, the IMAGE column stays blank and photos live in
the source catalog.

## 4. Build order

| Phase | Scope | Status |
|---|---|---|
| 0 | Sheet-format export (`Export sheet` button) | **Done** |
| 1 | `POST /api/ai/parse-catalog` + rasterize + vision parse + normalize | Next: needs `ANTHROPIC_API_KEY` in env |
| 2 | Review UI (page image vs parsed rows) + "Create quotation" | After 1 |
| 3 | Image cropping into item thumbnails | After 2 |
| 4 | Price memory: parsed items feed a catalog table so repeat items suggest last-used rates | Later |

## 5. Configuration

Admins manage this from **Settings** (header link, admin-only): the Anthropic API key
(stored encrypted in the database, shown masked) and the parsing model. Values saved
there override the server environment; the env vars remain as bootstrap fallback:

```bash
# .env (fallback when nothing is set in Settings)
ANTHROPIC_API_KEY="sk-ant-..."      # server-side only
AI_PARSE_MODEL="claude-fable-5"     # vision model for catalog parsing
```

Model guidance: handwritten rates (the scanned catalog) read most reliably on
**Fable 5** or **Opus 4.8**; **Sonnet 5** is fine for clean text-layer PDFs; Haiku only
for printed text. Parsing volume is low, so the per-catalog cost difference is small.
