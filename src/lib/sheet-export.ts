import * as XLSX from "xlsx";
import type { QuoteData, TotalsResult } from "./types";

// Exports the quote as a rate-sheet workbook matching the team's existing
// Google Sheet format: CATEGORY | IMAGE | DESCRIPTION | SPECIFICATION | UNIT |
// PRICE | QUANTITY | TOTAL, items grouped under a room header row, with the
// Subtotal / Packing / Loading / GST / TOTAL summary block at the end.
// The IMAGE column stays blank (SheetJS can't embed images); images still
// travel via the PDF export.

const HEADERS = ["CATEGORY", "IMAGE", "DESCRIPTION", "SPECIFICATION", "UNIT", "PRICE", "QUANTITY", "TOTAL"];

export function buildQuoteSheet(data: QuoteData, computed: TotalsResult): XLSX.WorkBook {
  const rows: (string | number)[][] = [[...HEADERS]];

  for (const room of data.rooms) {
    if (!room.items.length) continue;
    rows.push([room.name ? room.name.toUpperCase() : "ROOM", "", "", "", "", "", "", ""]);
    for (const it of room.items) {
      const spec = [it.specification, it.material && `Material: ${it.material}`, it.fabric && `Fabric: ${it.fabric}`]
        .filter(Boolean)
        .join("; ");
      const total = (it.price || 0) * (it.unitValue || 1) * (it.quantity || 0);
      // Include unitValue in the UNIT column ("60 SQFT") so PRICE × QTY × UNIT
      // visibly reproduces TOTAL for area/length-rated items.
      const unitLabel = (it.unitValue || 1) !== 1
        ? `${it.unitValue} ${(it.unitType || "nos").toUpperCase()}`
        : (it.unitType || "nos").toUpperCase();
      rows.push([
        it.category || "",
        "", // IMAGE placeholder column
        it.description || "",
        spec,
        unitLabel,
        it.price || 0,
        it.quantity || 0,
        total,
      ]);
    }
    rows.push(["", "", "", "", "", "", "", ""]);
  }

  const t = computed.totals;
  rows.push(["", "", "", "", "", "", "SUBTOTAL", Math.round(t.subtotalGross - t.discountItems - t.discountRooms - t.discountOverall)]);
  rows.push(["", "", "", "", "", "", `PACKING CHARGE @${data.charges.packingPercent || 0}%`, Math.round(t.packing)]);
  rows.push(["", "", "", "", "", "", "LOADING", Math.round(t.loading)]);
  if (data.charges.splitCgstSgst) {
    rows.push(["", "", "", "", "", "", `CGST @${(data.charges.gstPercent || 0) / 2}%`, Math.round(t.cgst)]);
    rows.push(["", "", "", "", "", "", `SGST @${(data.charges.gstPercent || 0) / 2}%`, Math.round(t.sgst)]);
  } else {
    rows.push(["", "", "", "", "", "", `GST @${data.charges.gstPercent || 0}%`, Math.round(t.gst)]);
  }
  rows.push(["", "", "", "", "", "", "TOTAL", Math.round(t.grandTotal)]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, { wch: 10 }, { wch: 32 }, { wch: 40 }, { wch: 8 }, { wch: 12 }, { wch: 22 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Quotation");
  return wb;
}

export function downloadQuoteSheet(data: QuoteData, computed: TotalsResult) {
  const wb = buildQuoteSheet(data, computed);
  const safeNumber = (data.quote.number || "quotation").replace(/[^\w.-]+/g, "-");
  XLSX.writeFile(wb, `${safeNumber}.xlsx`);
}
