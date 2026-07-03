export type UnitType = "nos" | "set" | "sqft" | "rft" | "lft" | "mtr";
export type DiscountType = "flat" | "percent";
export type GstMode = "excluded" | "included";
export type TotalsLine = { key: string; label: string; value: number; emphasis?: boolean; isLast?: boolean };
export type TotalsResult = {
  summaryByRoom: Array<{ id: string; name: string; gross: number; itemDisc: number; roomDisc: number; net: number }>;
  totals: {
    subtotalGross: number;
    discountItems: number;
    discountRooms: number;
    discountOverall: number;
    amountAfterDiscount: number;
    packing: number;
    loading: number;
    gst: number;
    cgst: number;
    sgst: number;
    grandTotal: number;
    lines: TotalsLine[];
  };
};

export type QuoteItem = {
  id: string;
  category: string;
  description: string;
  specification: string;
  fabric?: string;
  material?: string;
  dimensions?: { l: number; w: number; h: number };
  imageUrl?: string;
  unitValue: number;
  unitType: UnitType;
  price: number;
  quantity: number;
  discountValue: number;
  discountType: DiscountType;
};

export type QuoteRoom = {
  id: string;
  name: string;
  roomDiscountValue: number;
  roomDiscountType: DiscountType;
  moodBoard: string[];
  items: QuoteItem[];
};

export type QuoteMeta = {
  number: string;
  date: string;
  validityDays: number;
  siteName: string;
  salesPerson: string;
};

export type CompanyPayment = {
  upiId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
};

export type QuoteData = {
  version: 2;
  client: { name: string; phone: string; address: string };
  quote: QuoteMeta;
  rooms: QuoteRoom[];
  charges: {
    packingPercent: number;
    loadingCharge: number;
    gstPercent: number;
    gstMode: GstMode;
    splitCgstSgst: boolean;
    overallDiscountValue: number;
    overallDiscountType: DiscountType;
  };
  payment: CompanyPayment;
  updatedAt: number;
};

export type Draft = { id: string; name: string; savedAt: number; data: QuoteData };
