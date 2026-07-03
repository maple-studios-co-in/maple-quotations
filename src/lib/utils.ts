import { QuoteData, QuoteItem, QuoteRoom, DiscountType, UnitType, Draft, QuoteMeta, CompanyPayment, TotalsResult, TotalsLine } from "./types";

export const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const UNIT_CONVERSION = {
  in: 25.4,
  ft: 304.8,
  cm: 10,
  mm: 1,
};

export function makeId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function toNumber(value: string | number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function money(n: number) {
  return INR.format(Math.round((n || 0) * 100) / 100);
}

export function clampPercent(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function applyDiscount(amount: number, value: number, type: DiscountType) {
  const base = amount || 0;
  const v = value || 0;
  if (type === "percent") return Math.max(0, base - base * (clampPercent(v) / 100));
  return Math.max(0, base - v);
}

export function discountAmount(amount: number, value: number, type: DiscountType) {
  const base = amount || 0;
  return Math.max(0, base - applyDiscount(base, value, type));
}

export function quickConvert(value: number, from: keyof typeof UNIT_CONVERSION) {
  return Math.round(value * UNIT_CONVERSION[from]);
}

export function computeTotals(data: QuoteData): TotalsResult {
  const summaryByRoom = data.rooms.map((room) => {
    const gross = room.items.reduce((s, it) => s + (it.price || 0) * (it.unitValue || 1) * (it.quantity || 0), 0);
    const itemDisc = room.items.reduce(
      (s, it) => s + discountAmount((it.price || 0) * (it.unitValue || 1) * (it.quantity || 0), it.discountValue, it.discountType),
      0,
    );
    const afterItemDisc = Math.max(0, gross - itemDisc);
    const roomDisc = discountAmount(afterItemDisc, room.roomDiscountValue, room.roomDiscountType);
    const net = Math.max(0, afterItemDisc - roomDisc);
    return { id: room.id, name: room.name, gross, itemDisc, roomDisc, net };
  });

  const subtotalGross = summaryByRoom.reduce((s, r) => s + r.gross, 0);
  const discountItems = summaryByRoom.reduce((s, r) => s + r.itemDisc, 0);
  const discountRooms = summaryByRoom.reduce((s, r) => s + r.roomDisc, 0);
  const subtotalAfterRoom = Math.max(0, subtotalGross - discountItems - discountRooms);
  const discountOverall = discountAmount(subtotalAfterRoom, data.charges.overallDiscountValue, data.charges.overallDiscountType);
  const taxableOrFinal = Math.max(0, subtotalAfterRoom - discountOverall);

  const packing = taxableOrFinal * ((data.charges.packingPercent || 0) / 100);
  const loading = data.charges.loadingCharge || 0;

  const gstRate = (data.charges.gstPercent || 0) / 100;
  let baseForTax = taxableOrFinal;
  let gst = taxableOrFinal * gstRate;
  let grandTotal = taxableOrFinal + packing + loading + gst;

  if (data.charges.gstMode === "included") {
    baseForTax = taxableOrFinal / (1 + gstRate);
    gst = taxableOrFinal - baseForTax;
    grandTotal = taxableOrFinal + packing + loading;
  }

  const cgst = data.charges.splitCgstSgst ? gst / 2 : 0;
  const sgst = data.charges.splitCgstSgst ? gst / 2 : 0;

  const lines: TotalsLine[] = [
    { key: "subtotal", label: "Subtotal (gross)", value: subtotalGross },
    { key: "disc-items", label: "Less: Item discounts", value: -discountItems },
    { key: "disc-rooms", label: "Less: Room discounts", value: -discountRooms },
    { key: "disc-overall", label: "Less: Overall discount", value: -discountOverall },
    { key: "after-discount", label: "Amount after discounts", value: taxableOrFinal, emphasis: true },
    { key: "packing", label: `Packing Charge (${data.charges.packingPercent || 0}%)`, value: packing },
    { key: "loading", label: "Loading Charge", value: loading },
  ];

  if (data.charges.gstMode === "excluded") {
    if (data.charges.splitCgstSgst) {
      lines.push({ key: "cgst", label: `CGST (${(data.charges.gstPercent || 0) / 2}%)`, value: cgst });
      lines.push({ key: "sgst", label: `SGST (${(data.charges.gstPercent || 0) / 2}%)`, value: sgst });
    } else {
      lines.push({ key: "gst", label: `GST (${data.charges.gstPercent || 0}%)`, value: gst });
    }
  } else {
    if (data.charges.splitCgstSgst) {
      lines.push({ key: "cgst-inc", label: `CGST (included)`, value: cgst });
      lines.push({ key: "sgst-inc", label: `SGST (included)`, value: sgst });
    } else {
      lines.push({ key: "gst-inc", label: "GST (included)", value: gst });
    }
  }
  
  lines.push({ key: "grand", label: "Grand Total", value: grandTotal, emphasis: true, isLast: true });

  return {
    summaryByRoom,
    totals: {
      subtotalGross,
      discountItems,
      discountRooms,
      discountOverall,
      amountAfterDiscount: taxableOrFinal,
      packing,
      loading,
      gst,
      cgst,
      sgst,
      grandTotal,
      lines,
    },
  };
}

export function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function newItem(p?: Partial<QuoteItem>): QuoteItem {
  return {
    id: makeId(),
    category: "",
    description: "",
    specification: "",
    unitValue: 1,
    unitType: "nos",
    price: 0,
    quantity: 1,
    discountValue: 0,
    discountType: "flat",
    fabric: "",
    material: "",
    dimensions: { l: 0, w: 0, h: 0 },
    imageUrl: "",
    ...p,
  };
}

export function newRoom(name = ""): QuoteRoom {
  return { id: makeId(), name, roomDiscountValue: 0, roomDiscountType: "flat", moodBoard: [], items: [] };
}

/** localStorage.setItem that survives quota errors (returns false instead of throwing). */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Share payload: UTF-8 safe (Hindi names etc.) base64url, with embedded images
 *  stripped — a link should carry the quote, not megabytes of photos. */
export function encodeShareData(data: QuoteData): string {
  const lean: QuoteData = {
    ...data,
    rooms: data.rooms.map((r) => ({
      ...r,
      items: r.items.map((it) => (it.imageUrl?.startsWith("data:") ? { ...it, imageUrl: "" } : it)),
    })),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(lean));
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a share payload; understands both the UTF-8 format and legacy plain-btoa links. */
export function decodeShareData(encoded: string): QuoteData | null {
  const tryParse = (json: string): QuoteData | null => {
    const parsed = safeParse<QuoteData>(json);
    return parsed && parsed.version === 2 ? parsed : null;
  };
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = tryParse(new TextDecoder().decode(base64ToBytes(b64)));
    if (decoded) return decoded;
  } catch {}
  try {
    return tryParse(atob(encoded)); // legacy links
  } catch {
    return null;
  }
}
