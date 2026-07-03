import React from "react";
import {
  Page, Text, View, Document, StyleSheet, Image
} from "@react-pdf/renderer";
import { MAPLE_LOGO_B64 } from "@maple/core/lib/maple-logo-b64";
import { money, discountAmount } from "@maple/core/lib/utils";
import { QuoteData, TotalsResult, TotalsLine } from "@maple/core/lib/types";

/** Brand profile for the PDF. `logoUrl`/`bannerUrl` must already be data URLs
 *  (the call site fetches and converts them) so @react-pdf renders reliably. */
export type PdfBrand = {
  name: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  website: string | null;
  tagline: string | null;
};

// Legacy Maple Furnishers details — used only when the tenant profile leaves a
// field blank, so existing installs keep producing a complete document.
const FALLBACK = {
  name: "Maple Furnishers",
  addressLine1: "B-3, W.H.S. Timber Market Kirti Nagar",
  addressLine2: "Delhi-110015",
  phone: "9211819727",
  email: "maplefurnishers77@gmail.com",
  website: "shop.maplefurnishers.com",
  tagline: "Heritage luxury · Bespoke craft",
};

const CREAM = "#f7f1e6";
const INK = "#1c1917";
const MUTED = "#6b6560";
const HAIRLINE = "#e7e0d6";
const DEFAULT_ACCENT = "#7a2e2a";

// Built-in Times/Helvetica fonts cannot encode the rupee glyph (₹), so amounts
// are printed with an "Rs" prefix instead of registering an external font.
const rs = (n: number) => money(n).replace(/₹\s?/, "Rs ");

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingHorizontal: 44,
    paddingBottom: 72,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 9,
    color: INK,
  },
  banner: { marginTop: -40, marginHorizontal: -44, marginBottom: 22 },
  bannerImage: { width: "100%", height: 110, objectFit: "cover" },

  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  headerLogo: { width: 44, height: 44, marginRight: 14, objectFit: "contain" },
  companyName: { fontFamily: "Times-Bold", fontSize: 20, marginBottom: 3 },
  companyLine: { fontSize: 8, color: MUTED, lineHeight: 1.45 },

  proposalTitle: { fontFamily: "Times-Roman", fontSize: 26, letterSpacing: 6, marginTop: 16, marginBottom: 14 },

  infoRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  infoCard: { flex: 1, backgroundColor: CREAM, borderRadius: 4, borderWidth: 0.75, padding: 12 },
  infoLabel: { fontFamily: "Helvetica-Bold", fontSize: 7, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
  infoMain: { fontFamily: "Helvetica-Bold", fontSize: 11, color: INK, marginBottom: 3 },
  infoSub: { fontSize: 8, color: MUTED, lineHeight: 1.45 },

  roomBand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 3,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  roomName: { fontFamily: "Times-Bold", fontSize: 11, color: "#ffffff" },
  roomCount: { fontSize: 7.5, color: "#ffffff", opacity: 0.85 },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: HAIRLINE,
  },
  itemThumb: { width: 42, height: 42, borderRadius: 3, marginRight: 10, objectFit: "cover" },
  itemBody: { flex: 1, paddingRight: 10 },
  itemName: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 2 },
  itemDesc: { fontSize: 8, color: MUTED, lineHeight: 1.4 },
  itemRight: { width: 110, alignItems: "flex-end" },
  itemQtyRate: { fontSize: 8, color: MUTED, marginBottom: 2 },
  itemTotal: { fontFamily: "Helvetica-Bold", fontSize: 10 },

  roomNetRow: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 6, marginBottom: 14 },
  roomNetText: { fontFamily: "Helvetica-Bold", fontSize: 9 },

  totalsBlock: { alignSelf: "flex-end", width: "55%", marginTop: 10 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalsLabel: { fontSize: 9, color: MUTED },
  totalsValue: { fontSize: 9, color: INK },
  grandRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 8, borderTopWidth: 1 },
  grandText: { fontFamily: "Times-Bold", fontSize: 14 },

  sectionHeading: { fontFamily: "Helvetica-Bold", fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 },
  termText: { fontSize: 8, color: INK, lineHeight: 1.5, marginBottom: 4 },

  paymentCard: { backgroundColor: CREAM, borderRadius: 4, borderWidth: 0.75, padding: 12, flexDirection: "row", gap: 16 },
  paymentCol: { flex: 1 },
  paymentLabel: { fontFamily: "Helvetica-Bold", fontSize: 7, letterSpacing: 1, textTransform: "uppercase", color: MUTED, marginBottom: 3 },
  paymentValue: { fontSize: 9, color: INK, marginBottom: 6 },

  footer: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    borderTopWidth: 0.75,
    borderTopColor: HAIRLINE,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  footerText: { fontSize: 7, color: MUTED },
  footerCenter: { fontFamily: "Times-Italic", fontSize: 7, color: MUTED, textAlign: "center", flex: 1 },
});

export function MasterProposalPdf({ data, computed, terms, brand }: { data: QuoteData; computed: TotalsResult; terms: string[]; brand: PdfBrand }) {
  const { client, quote, rooms, payment } = data;
  const { totals } = computed;

  const accent = brand.primaryColor || DEFAULT_ACCENT;
  const name = brand.name || FALLBACK.name;
  const addressLine1 = brand.addressLine1 || FALLBACK.addressLine1;
  const addressLine2 = brand.addressLine2 || FALLBACK.addressLine2;
  const phone = brand.phone || FALLBACK.phone;
  const email = brand.email || FALLBACK.email;
  const website = brand.website || FALLBACK.website;
  const tagline = brand.tagline || FALLBACK.tagline;
  const logo = brand.logoUrl || MAPLE_LOGO_B64;

  const hasPayment = Boolean(payment && (payment.upiId || payment.bankName || payment.accountName || payment.accountNumber || payment.ifsc));

  return (
    <Document title={`${name} Proposal - ${quote.number}`}>
      <Page size="A4" style={styles.page}>
        {brand.bannerUrl && (
          <View style={styles.banner}>
            <Image src={brand.bannerUrl} style={styles.bannerImage} />
          </View>
        )}

        <View style={styles.headerRow}>
          {logo && <Image src={logo} style={styles.headerLogo} />}
          <View style={{ flex: 1 }}>
            <Text style={[styles.companyName, { color: accent }]}>{name}</Text>
            <Text style={styles.companyLine}>{[addressLine1, addressLine2].filter(Boolean).join(", ")}</Text>
            <Text style={styles.companyLine}>{[phone, email].filter(Boolean).join("  ·  ")}</Text>
            <Text style={styles.companyLine}>{[brand.gstin ? `GSTIN ${brand.gstin}` : null, website].filter(Boolean).join("  ·  ")}</Text>
          </View>
        </View>

        <View style={{ height: 1.5, backgroundColor: accent, marginBottom: 2 }} />
        <Text style={[styles.proposalTitle, { color: INK }]}>PROPOSAL</Text>

        <View style={styles.infoRow}>
          <View style={[styles.infoCard, { borderColor: accent }]}>
            <Text style={[styles.infoLabel, { color: accent }]}>Prepared for</Text>
            <Text style={styles.infoMain}>{client.name || "Valued Client"}</Text>
            {client.phone ? <Text style={styles.infoSub}>{client.phone}</Text> : null}
            {client.address ? <Text style={styles.infoSub}>{client.address}</Text> : null}
          </View>
          <View style={[styles.infoCard, { borderColor: accent }]}>
            <Text style={[styles.infoLabel, { color: accent }]}>Reference</Text>
            <Text style={styles.infoMain}>{quote.number || "—"}</Text>
            <Text style={styles.infoSub}>Date: {quote.date || "—"}{quote.validityDays ? `  ·  Valid ${quote.validityDays} days` : ""}</Text>
            {quote.salesPerson ? <Text style={styles.infoSub}>Sales: {quote.salesPerson}</Text> : null}
            {quote.siteName ? <Text style={styles.infoSub}>Site: {quote.siteName}</Text> : null}
          </View>
        </View>

        {rooms.map((room) => {
          const summary = computed.summaryByRoom.find((s) => s.id === room.id);
          return (
            <View key={room.id} style={{ marginBottom: 4 }}>
              <View style={[styles.roomBand, { backgroundColor: accent }]}>
                <Text style={styles.roomName}>{room.name || "Room"}</Text>
                <Text style={styles.roomCount}>{room.items.length} {room.items.length === 1 ? "item" : "items"}</Text>
              </View>

              {room.items.map((item) => {
                const gross = (item.price || 0) * (item.unitValue || 1) * (item.quantity || 0);
                const discAmt = discountAmount(gross, item.discountValue, item.discountType);
                const net = Math.max(0, gross - discAmt);
                const detail = [item.description, item.specification].filter(Boolean).join(" — ");
                return (
                  <View key={item.id} wrap={false} style={styles.itemRow}>
                    {item.imageUrl ? <Image src={item.imageUrl} style={styles.itemThumb} /> : null}
                    <View style={styles.itemBody}>
                      <Text style={styles.itemName}>{item.category || "Item"}</Text>
                      {detail ? <Text style={styles.itemDesc}>{detail}</Text> : null}
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={styles.itemQtyRate}>{item.quantity} {item.unitType} × {rs(item.price)}</Text>
                      <Text style={styles.itemTotal}>{rs(net)}</Text>
                    </View>
                  </View>
                );
              })}

              <View style={styles.roomNetRow}>
                <Text style={[styles.roomNetText, { color: accent }]}>{room.name || "Room"} total  {rs(summary?.net ?? 0)}</Text>
              </View>
            </View>
          );
        })}

        <View wrap={false} style={styles.totalsBlock}>
          {totals.lines.filter((l) => !l.isLast && (Math.abs(l.value) > 0 || l.key === "subtotal")).map((line: TotalsLine) => (
            <View key={line.key} style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>{line.label}</Text>
              <Text style={styles.totalsValue}>{rs(line.value)}</Text>
            </View>
          ))}
          <View style={[styles.grandRow, { borderTopColor: accent }]}>
            <Text style={[styles.grandText, { color: accent }]}>Grand Total</Text>
            <Text style={[styles.grandText, { color: accent }]}>{rs(totals.grandTotal)}</Text>
          </View>
        </View>

        {terms?.length > 0 && (
          <View wrap={false} style={{ marginTop: 26 }}>
            <Text style={[styles.sectionHeading, { color: accent }]}>Terms &amp; Conditions</Text>
            {terms.map((term, i) => (
              <Text key={i} style={styles.termText}>{i + 1}.  {term}</Text>
            ))}
          </View>
        )}

        {hasPayment && (
          <View wrap={false} style={{ marginTop: 22 }}>
            <Text style={[styles.sectionHeading, { color: accent }]}>Payment</Text>
            <View style={[styles.paymentCard, { borderColor: accent }]}>
              <View style={styles.paymentCol}>
                {payment.upiId ? (
                  <>
                    <Text style={styles.paymentLabel}>UPI</Text>
                    <Text style={styles.paymentValue}>{payment.upiId}</Text>
                  </>
                ) : null}
                {payment.bankName ? (
                  <>
                    <Text style={styles.paymentLabel}>Bank</Text>
                    <Text style={styles.paymentValue}>{payment.bankName}</Text>
                  </>
                ) : null}
              </View>
              <View style={styles.paymentCol}>
                {payment.accountName ? (
                  <>
                    <Text style={styles.paymentLabel}>Account name</Text>
                    <Text style={styles.paymentValue}>{payment.accountName}</Text>
                  </>
                ) : null}
                {payment.accountNumber ? (
                  <>
                    <Text style={styles.paymentLabel}>Account number</Text>
                    <Text style={styles.paymentValue}>{payment.accountNumber}</Text>
                  </>
                ) : null}
                {payment.ifsc ? (
                  <>
                    <Text style={styles.paymentLabel}>IFSC</Text>
                    <Text style={styles.paymentValue}>{payment.ifsc}</Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>
        )}

        <View fixed style={styles.footer}>
          <Text style={[styles.footerText, { width: 150 }]}>{website || ""}</Text>
          <Text style={styles.footerCenter}>{tagline || ""}</Text>
          <Text style={[styles.footerText, { width: 150, textAlign: "right" }]} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
