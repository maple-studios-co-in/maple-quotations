# Maple Quotations — User Guide

A tool for building professional furniture quotations — organise items by room, apply
discounts and GST, preview live, and export a branded PDF.

---

## Signing in

1. Open the app (e.g. **http://localhost:3000** locally, or your hosted URL).
2. Enter your email and password. The default admin is
   **admin@maplefurnishers.com / maple@123** (change this after first login).
3. You land on the quotation builder.

Sign out any time from the **Sign out** button in the top-right.

## The screen at a glance

- **Top bar** — the quote number, a "Live editing" indicator, and actions:
  Undo/Redo, Templates, Share, Save draft, Save, **Generate PDF**.
- **Tabs** — Overview · Rooms & Items · Finance & T&C · Settlement · Drafts · Saved.
- **Right panel** — a live financial summary and a live PDF preview (click it to export).

## Building a quote

### 1. Overview
Enter the **client** (name, phone, project/delivery address) and the **proposal** details
(quote number, date, validity, sales executive, site name). The quote number is generated
automatically but you can edit it.

### 2. Rooms & Items
Quotes are organised by room (e.g. Living Room, Master Bedroom).

- **+ Create room** to add a room; rename it inline; the circled number is its order.
- **+ Item** adds a line; or use **Quick add template…** for common pieces (wardrobe,
  kitchen, sofa, etc.).
- For each item set: category, description, material, fabric, **unit rate**, **unit**
  (NOS/SET/SQFT/RFT), **unit value**, and **quantity**. The line total updates live.
- **Item image** — hover the thumbnail to upload a file or paste an image URL.
- **Room discount** — a flat ₹ or % discount applied to that room; the room's net shows
  at the bottom.

**Import from Excel** — the "Import Excel" button reads an `.xlsx`: it maps columns like
Category, Description, Price, Quantity, Unit, Material, and pulls in embedded images. It
also picks up client/site fields if present (Client Name, Phone, Address, Site, Quote No).

### 3. Finance & T&C
- **Global discount** — flat ₹ or % off the whole quote.
- **GST** — set the rate and whether it's **Extra** (added on top) or **Inclusive**
  (already in the prices). Tick **Split GST into CGST + SGST** for intra-state billing.
- **Packing & handling (%)** and **Logistics / loading (₹)**.
- **Terms & conditions** — edit, add, or remove terms; sensible defaults are pre-filled.

### 4. Settlement
Your UPI ID and bank details (bank, account holder, account number, IFSC) that appear on
the proposal.

## Saving your work

- **Save draft** — stores the quote **in this browser** (local only, private to you).
  Find them under the **Drafts** tab.
- **Save** — stores the quote **in the system database**, linked to the client. Find these
  under the **Saved** tab; they persist across devices and are visible to the team. From
  Saved you can **Load** a quote back into the builder or delete it.
- **Share** — copies a link that encodes the whole quote; opening it loads the quote for the
  recipient (no login needed to view via the link).
- Autosave: your latest working quote is remembered in the browser and restored next visit.

## Exporting the PDF

Click **Generate PDF** (or the preview panel, or press **Ctrl/⌘ + P**). A branded proposal
opens in a new tab with the company header/logo, per-room item tables, the full financial
breakdown, and your terms — ready to print or send.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Ctrl/⌘ + S | Save draft |
| Ctrl/⌘ + P | Generate PDF |
| Ctrl/⌘ + Z | Undo |
| Ctrl/⌘ + Shift + Z | Redo |

## Tips

- The **right-hand summary** always reflects the current numbers — use it to sanity-check
  discounts and GST before exporting.
- **Drafts vs Saved**: drafts are local and disposable; use **Save** for anything the team
  needs or that must survive a browser clear.
- Set a real client **name** before saving to the system — quotations are linked to clients
  by name, so it's required for a system save.
