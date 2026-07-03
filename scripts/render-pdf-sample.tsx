// Dev utility: render the proposal PDF outside the browser to iterate on design.
//   npx tsx scripts/render-pdf-sample.tsx [logo.png] [banner.png] [out.pdf]
import fs from "node:fs";
import React from "react";
import { renderToFile } from "@react-pdf/renderer";
import { MasterProposalPdf } from "../app/pdf-catalog";
import { computeTotals } from "../src/lib/utils";
import type { QuoteData } from "../src/lib/types";

const [logoPath, bannerPath, outPath = "/tmp/mq-proposal-sample.pdf"] = process.argv.slice(2);

const toDataUrl = (p?: string) =>
  p && fs.existsSync(p) ? `data:image/png;base64,${fs.readFileSync(p).toString("base64")}` : null;

const itemImage = (() => {
  const p = "/tmp/mq-crops/DINING_TABLE.jpg";
  return fs.existsSync(p) ? `data:image/jpeg;base64,${fs.readFileSync(p).toString("base64")}` : "";
})();

const data: QuoteData = {
  version: 2,
  client: { name: "Asha Rao", phone: "9812345678", address: "14 Ridge Road, Dwarka, New Delhi" },
  quote: { number: "MF/2026/Q-042", date: "2026-07-03", validityDays: 15, siteName: "Skyline Residency", salesPerson: "Senior Consultant" },
  rooms: [
    {
      id: "r1", name: "405 - Living Dining Kitchen", roomDiscountValue: 0, roomDiscountType: "flat", moodBoard: [],
      items: [
        { id: "i1", category: "Dining Table", description: "Marble top, wooden body", specification: "L 2250 x W 1050 x H 750 mm", unitValue: 1, unitType: "nos", price: 85000, quantity: 1, discountValue: 0, discountType: "flat", imageUrl: itemImage },
        { id: "i2", category: "Dining Chair", description: "Upholstered, set of 8", specification: "L 450 x W 450, Seat Ht 450 mm", unitValue: 1, unitType: "nos", price: 18000, quantity: 8, discountValue: 0, discountType: "flat" },
        { id: "i3", category: "Formal Sofa", description: "Curved 4-seater", specification: "L 2600 x W 750 mm", unitValue: 1, unitType: "nos", price: 114000, quantity: 1, discountValue: 0, discountType: "flat" },
      ],
    },
    {
      id: "r2", name: "405 - Master Bedroom", roomDiscountValue: 5, roomDiscountType: "percent", moodBoard: [],
      items: [
        { id: "i4", category: "Bed + Backrest", description: "Upholstered king bed", specification: "L 2130 x W 1980; backrest W 2980 mm", unitValue: 1, unitType: "nos", price: 110000, quantity: 1, discountValue: 0, discountType: "flat" },
        { id: "i5", category: "Peg Table", description: "", specification: "L 400 x W 300 x H 600 mm", unitValue: 1, unitType: "nos", price: 25000, quantity: 1, discountValue: 0, discountType: "flat" },
      ],
    },
  ],
  charges: { packingPercent: 3, loadingCharge: 3500, gstPercent: 18, gstMode: "excluded", splitCgstSgst: true, overallDiscountValue: 0, overallDiscountType: "flat" },
  payment: { upiId: "maplefurnishers@axis", bankName: "Heritage Bank", accountName: "Maple Furnishers", accountNumber: "50100223344556", ifsc: "HDFC0001234" },
  updatedAt: 0,
};

const brand = {
  name: "Maple Furnishers",
  logoUrl: toDataUrl(logoPath),
  bannerUrl: toDataUrl(bannerPath),
  primaryColor: "#8f1f2b",
  addressLine1: "B-3, W.H.S. Timber Market Kirti Nagar",
  addressLine2: "Delhi-110015",
  phone: "9211819727",
  email: "hello@maplefurnishers.com",
  gstin: "07AAAAA0000A1Z5",
  website: "shop.maplefurnishers.com",
  tagline: "Furniture Tailored to Your Narrative.",
};

const terms = [
  "50% Advance at the time of booking.",
  "40% After completion of woodwork structure.",
  "10% Before delivery of items.",
  "GST will be extra as applicable.",
];

renderToFile(
  <MasterProposalPdf data={data} computed={computeTotals(data)} terms={terms} brand={brand} />,
  outPath
).then(() => console.log("rendered:", outPath));
