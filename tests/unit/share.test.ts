import { describe, it, expect } from "vitest";
import { encodeShareData, decodeShareData, newItem, newRoom } from "../../src/lib/utils";
import type { QuoteData } from "../../src/lib/types";

function quote(partial: Partial<QuoteData> = {}): QuoteData {
  return {
    version: 2,
    client: { name: "Asha Rao", phone: "98123", address: "Dwarka" },
    quote: { number: "MF/TEST", date: "2026-01-01", validityDays: 15, siteName: "", salesPerson: "" },
    rooms: [],
    charges: { packingPercent: 0, loadingCharge: 0, gstPercent: 18, gstMode: "excluded", splitCgstSgst: false, overallDiscountValue: 0, overallDiscountType: "flat" },
    payment: { upiId: "", bankName: "", accountName: "", accountNumber: "", ifsc: "" },
    updatedAt: 0,
    ...partial,
  };
}

describe("share link codec", () => {
  it("round-trips a plain quote", () => {
    const q = quote();
    expect(decodeShareData(encodeShareData(q))).toEqual(q);
  });

  it("survives non-Latin1 text (the old btoa crashed on this)", () => {
    const q = quote({ client: { name: "राहुल शर्मा", phone: "98", address: "नई दिल्ली — फ़्लैट ४" } });
    const decoded = decodeShareData(encodeShareData(q));
    expect(decoded?.client.name).toBe("राहुल शर्मा");
    expect(decoded?.client.address).toBe("नई दिल्ली — फ़्लैट ४");
  });

  it("carries terms with the quote", () => {
    const q = quote({ terms: ["60% advance", "Delivery in 6 weeks"] });
    expect(decodeShareData(encodeShareData(q))?.terms).toEqual(["60% advance", "Delivery in 6 weeks"]);
  });

  it("strips embedded photos but keeps linked image URLs", () => {
    const room = { ...newRoom("Living"), items: [
      newItem({ category: "Sofa", imageUrl: "data:image/jpeg;base64,AAAA" }),
      newItem({ category: "Chair", imageUrl: "https://example.com/chair.jpg" }),
    ]};
    const decoded = decodeShareData(encodeShareData(quote({ rooms: [room] })));
    expect(decoded?.rooms[0].items[0].imageUrl).toBe("");
    expect(decoded?.rooms[0].items[1].imageUrl).toBe("https://example.com/chair.jpg");
  });

  it("produces URL-safe output (no + / =)", () => {
    const encoded = encodeShareData(quote({ client: { name: "π".repeat(100), phone: "", address: "" } }));
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("still decodes legacy plain-btoa links", () => {
    const q = quote();
    const legacy = btoa(JSON.stringify(q));
    expect(decodeShareData(legacy)).toEqual(q);
  });

  it("returns null for garbage", () => {
    expect(decodeShareData("not-a-link")).toBeNull();
    expect(decodeShareData(btoa("{\"version\":1}"))).toBeNull();
  });
});

describe("newItem defaults", () => {
  it("starts at quantity 1 / unitValue 1 so a fresh item counts once", () => {
    const it_ = newItem();
    expect(it_.quantity).toBe(1);
    expect(it_.unitValue).toBe(1);
  });
});
