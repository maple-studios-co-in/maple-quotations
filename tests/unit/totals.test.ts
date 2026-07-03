import { describe, it, expect } from "vitest";
import { computeTotals, applyDiscount, discountAmount, money, newItem, newRoom } from "../../src/lib/utils";
import type { QuoteData, QuoteItem } from "../../src/lib/types";

/** Build a minimal, valid QuoteData with the given rooms. */
function quote(partial: Partial<QuoteData> = {}): QuoteData {
  return {
    version: 2,
    client: { name: "Test", phone: "", address: "" },
    quote: { number: "MF/TEST", date: "2026-01-01", validityDays: 15, siteName: "", salesPerson: "" },
    rooms: [],
    charges: {
      packingPercent: 0,
      loadingCharge: 0,
      gstPercent: 18,
      gstMode: "excluded",
      splitCgstSgst: false,
      overallDiscountValue: 0,
      overallDiscountType: "flat",
    },
    payment: { upiId: "", bankName: "", accountName: "", accountNumber: "", ifsc: "" },
    updatedAt: 0,
    ...partial,
  };
}

function item(over: Partial<QuoteItem>): QuoteItem {
  return newItem(over);
}

describe("discount helpers", () => {
  it("applies a flat discount", () => {
    expect(applyDiscount(1000, 200, "flat")).toBe(800);
  });
  it("applies a percent discount", () => {
    expect(applyDiscount(1000, 10, "percent")).toBe(900);
  });
  it("clamps a percent discount to 0..100", () => {
    expect(applyDiscount(1000, 150, "percent")).toBe(0);
    expect(applyDiscount(1000, -50, "percent")).toBe(1000);
  });
  it("never goes negative on flat over-discount", () => {
    expect(applyDiscount(500, 900, "flat")).toBe(0);
  });
  it("discountAmount returns the amount removed", () => {
    expect(discountAmount(1000, 10, "percent")).toBe(100);
    expect(discountAmount(1000, 250, "flat")).toBe(250);
  });
});

describe("computeTotals", () => {
  const oneItem = quote({
    rooms: [{ ...newRoom("Living"), items: [item({ price: 1000, unitValue: 1, quantity: 2 })] }],
  });

  it("sums gross across rooms", () => {
    const r = computeTotals(oneItem);
    expect(r.totals.subtotalGross).toBe(2000);
  });

  it("adds GST (excluded mode) on top of the taxable amount", () => {
    const r = computeTotals(oneItem);
    expect(r.totals.gst).toBe(360); // 2000 * 18%
    expect(r.totals.grandTotal).toBe(2360);
  });

  it("splits GST into CGST + SGST when enabled", () => {
    const r = computeTotals(quote({
      rooms: oneItem.rooms,
      charges: { ...oneItem.charges, splitCgstSgst: true },
    }));
    expect(r.totals.cgst).toBe(180);
    expect(r.totals.sgst).toBe(180);
    expect(r.totals.cgst + r.totals.sgst).toBeCloseTo(r.totals.gst, 5);
  });

  it("treats GST as inclusive when gstMode = included (grand total unchanged)", () => {
    const r = computeTotals(quote({
      rooms: oneItem.rooms,
      charges: { ...oneItem.charges, gstMode: "included" },
    }));
    expect(r.totals.grandTotal).toBe(2000);
    expect(r.totals.gst).toBeCloseTo(2000 - 2000 / 1.18, 2); // ~305.08 backed out
  });

  it("applies an overall percent discount before tax", () => {
    const r = computeTotals(quote({
      rooms: oneItem.rooms,
      charges: { ...oneItem.charges, overallDiscountValue: 10, overallDiscountType: "percent" },
    }));
    expect(r.totals.discountOverall).toBe(200); // 10% of 2000
    expect(r.totals.amountAfterDiscount).toBe(1800);
    expect(r.totals.grandTotal).toBe(1800 + 1800 * 0.18); // 2124
  });

  it("applies item + room discounts in order", () => {
    const data = quote({
      rooms: [{
        ...newRoom("Bedroom"),
        roomDiscountValue: 10,
        roomDiscountType: "percent",
        items: [item({ price: 1000, unitValue: 1, quantity: 1, discountValue: 100, discountType: "flat" })],
      }],
      charges: { packingPercent: 0, loadingCharge: 0, gstPercent: 0, gstMode: "excluded", splitCgstSgst: false, overallDiscountValue: 0, overallDiscountType: "flat" },
    });
    const r = computeTotals(data);
    // gross 1000 - item 100 = 900; room 10% of 900 = 90; net 810
    expect(r.totals.discountItems).toBe(100);
    expect(r.totals.discountRooms).toBe(90);
    expect(r.summaryByRoom[0].net).toBe(810);
    expect(r.totals.grandTotal).toBe(810);
  });

  it("adds packing (%) and loading (flat) charges", () => {
    const r = computeTotals(quote({
      rooms: oneItem.rooms,
      charges: { ...oneItem.charges, gstPercent: 0, packingPercent: 5, loadingCharge: 500 },
    }));
    // 2000 + packing(5% = 100) + loading(500) + gst(0) = 2600
    expect(r.totals.packing).toBe(100);
    expect(r.totals.loading).toBe(500);
    expect(r.totals.grandTotal).toBe(2600);
  });

  it("always ends the lines array with the grand total", () => {
    const r = computeTotals(oneItem);
    const last = r.totals.lines[r.totals.lines.length - 1];
    expect(last.key).toBe("grand");
    expect(last.isLast).toBe(true);
    expect(last.value).toBe(r.totals.grandTotal);
  });
});

describe("money", () => {
  it("formats INR with no decimals", () => {
    expect(money(1000)).toBe("₹1,000");
    expect(money(1234.5)).toBe("₹1,235");
  });
  it("treats falsy as zero", () => {
    expect(money(0)).toBe("₹0");
  });
});
