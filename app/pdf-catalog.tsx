import React from "react";
import { 
  Page, Text, View, Document, StyleSheet, Image, Font 
} from "@react-pdf/renderer";
import { MAPLE_LOGO_B64 } from "@maple/core/lib/maple-logo-b64";
import { money, discountAmount } from "@maple/core/lib/utils";
import { QuoteData, TotalsResult, TotalsLine } from "@maple/core/lib/types";

// Register fonts to support Indian Rupee Symbol (₹) using reliable CDN
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 }
  ]
});

const styles = StyleSheet.create({
  page: { 
    padding: 40, 
    backgroundColor: "#ffffff",
    fontFamily: "Roboto",
    fontSize: 9,
    color: "#333333"
  },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    borderBottom: 2, 
    borderBottomColor: "#8a3535", 
    paddingBottom: 20,
    marginBottom: 30
  },
  logo: { width: 70, height: 70 },
  companyName: { 
    fontSize: 20, 
    fontWeight: 800,
    color: "#8a3535",
    marginBottom: 2
  },
  contactText: { fontSize: 8, color: "#7d6e63", textAlign: "right", lineHeight: 1.3 },
  
  metaSection: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 40,
    padding: 15,
    backgroundColor: "#f9f6f1", 
    borderRadius: 8
  },
  metaCol: { flex: 1 },
  metaLabel: { 
    fontSize: 7, 
    fontWeight: 700,
    color: "#8a3535", 
    textTransform: "uppercase", 
    letterSpacing: 1,
    marginBottom: 6
  },
  metaValue: { fontSize: 12, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 },
  metaSub: { fontSize: 8, color: "#666666", lineHeight: 1.4 },

  roomHeader: { 
    backgroundColor: "#8a3535", 
    padding: 10, 
    borderRadius: 4, 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 15
  },
  roomName: { color: "#ffffff", fontSize: 10, fontWeight: 700, textTransform: "uppercase" },
  roomCount: { color: "#ffffff", fontSize: 7, opacity: 0.8 },

  itemCard: { 
    flexDirection: "row", 
    border: 1, 
    borderColor: "#e6dfd1", 
    borderRadius: 8, 
    marginBottom: 15, 
    overflow: "hidden" 
  },
  imageBox: { width: 220, height: 220, backgroundColor: "#f3f3f3", position: "relative" },
  image: { width: "100%", height: "100%", objectFit: "cover" },
  watermark: { 
    position: "absolute", 
    bottom: 5, 
    right: 5, 
    width: 30, 
    height: 30, 
    opacity: 0.4 
  },
  
  cardBody: { flex: 1, padding: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  categoryTag: { 
    fontSize: 7, 
    fontWeight: 700,
    color: "#a67c52", 
    textTransform: "uppercase" 
  },
  priceStack: { textAlign: "right" },
  unitPrice: { fontSize: 8, color: "#777", marginBottom: 6 },
  totalPriceBox: {
    backgroundColor: "#8a3535",
    padding: 6,
    borderRadius: 4,
  },
  totalPrice: { fontSize: 13, fontWeight: 800, color: "#ffffff" },
  
  description: { fontSize: 8, color: "#444", lineHeight: 1.5, marginBottom: 10 },
  
  specGrid: { flexDirection: "row", flexWrap: "wrap", gap: 15 },
  specItem: { minWidth: 60 },
  specLabel: { fontSize: 6, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 2 },
  specValue: { fontSize: 8, color: "#1a1a1a", fontWeight: 700 },

  summaryTable: { marginTop: 30, border: 1, borderColor: "#e6dfd1", borderRadius: 8, padding: 15 },
  summaryTitle: { fontSize: 10, fontWeight: 700, color: "#8a3535", marginBottom: 12, textTransform: "uppercase" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottom: 0.5, borderBottomColor: "#eee" },
  summaryGrand: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginTop: 10, 
    paddingTop: 10, 
    borderTop: 1, 
    borderTopColor: "#8a3535" 
  },
  summaryGrandLabel: { fontSize: 10, fontWeight: 700, color: "#8a3535" },
  summaryGrandValue: { fontSize: 14, fontWeight: 800, color: "#8a3535" },
  tnc: { marginTop: 30, padding: 15, backgroundColor: "#fdfbf7", borderRadius: 8 },
  tncTitle: { fontSize: 11, fontWeight: 700, color: "#8a3535", marginBottom: 10, textTransform: "uppercase" },
  tncText: { fontSize: 10, color: "#4d4d4d", marginBottom: 6, lineHeight: 1.5 },

  footer: { position: "absolute", bottom: 30, left: 40, right: 40, borderTop: 0.5, borderTopColor: "#eee", paddingTop: 10 },
  footerLinks: { flexDirection: "row", justifyContent: "center", gap: 15, marginBottom: 5 },
  linkText: { fontSize: 7, color: "#a67c52", fontWeight: 700 },
  pageNumber: { fontSize: 6, color: "#ccc", textAlign: "center" }
});

const WatermarkedImage = ({ src }: { src?: string }) => (
  <View style={styles.imageBox}>
    {src ? (
      <>
        <Image src={src} style={styles.image} />
        <Image src={MAPLE_LOGO_B64} style={styles.watermark} />
      </>
    ) : (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 20, opacity: 0.1, fontWeight: 700 }}>MAPLE</Text>
      </View>
    )}
  </View>
);

export function MasterProposalPdf({ data, computed, terms, logo }: { data: QuoteData; computed: TotalsResult; terms: string[]; logo?: string }) {
  const { client, quote, rooms } = data;
  const { totals } = computed;

  return (
    <Document title={`Maple Proposal - ${quote.number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Image src={logo || MAPLE_LOGO_B64} style={styles.logo} />
          </View>
          <View style={{ alignItems: "flex-end", maxWidth: 300 }}>
            <Text style={styles.companyName}>MAPLE FURNISHERS</Text>
            <Text style={{ fontSize: 8, color: "#a67c52", fontWeight: 700, marginBottom: 6 }}>HERITAGE LUXURY | BESPOKE CRAFT</Text>
            <Text style={styles.contactText}>B-3, W.H.S. Timber Market Kriti Nagar, Delhi-110015</Text>
            <Text style={styles.contactText}>Phone: 9262968727, 9523619534</Text>
            <Text style={styles.contactText}>Email: maplefurnishers77@gmail.com</Text>
          </View>
        </View>

        <View style={styles.metaSection}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Client Details</Text>
            <Text style={styles.metaValue}>{client.name || "Valued Client"}</Text>
            <Text style={styles.metaSub}>{client.phone || "-"}</Text>
            <Text style={[styles.metaSub, { width: 220 }]}>{client.address || "-"}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Quotation Info</Text>
            <View style={{ flexDirection: "row", gap: 20 }}>
              <View>
                <Text style={styles.metaSub}>REF №</Text>
                <Text style={{ fontSize: 10, fontWeight: 700 }}>{quote.number || "-"}</Text>
              </View>
              <View>
                <Text style={styles.metaSub}>DATE</Text>
                <Text style={{ fontSize: 10, fontWeight: 700 }}>{quote.date || "-"}</Text>
              </View>
            </View>
          </View>
        </View>

        {rooms.map((room, rIdx) => (
          <View key={room.id} break={rIdx > 0} style={{ marginBottom: 40, paddingTop: rIdx > 0 ? 20 : 0 }}>
            <View style={styles.roomHeader}>
              <Text style={styles.roomName}>{room.name || "Room Section"}</Text>
              <Text style={styles.roomCount}>{room.items.length} LUXURY ITEMS</Text>
            </View>

            {room.items.map((item) => {
              const gross = (item.price || 0) * (item.unitValue || 1) * (item.quantity || 0);
              const discAmt = discountAmount(gross, item.discountValue, item.discountType);
              const net = Math.max(0, gross - discAmt);

              return (
                <View key={item.id} wrap={false} style={styles.itemCard}>
                  <WatermarkedImage src={item.imageUrl} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <View>
                        <Text style={styles.categoryTag}>{item.category || "Furniture"}</Text>
                        <Text style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a", marginTop: 2 }}>
                          {item.quantity} x {item.category}
                        </Text>
                      </View>
                      <View style={styles.priceStack}>
                        <Text style={styles.unitPrice}>Rate: {money(item.price)}</Text>
                        <View style={styles.totalPriceBox}>
                          <Text style={styles.totalPrice}>{money(net)}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.description}>{item.description}</Text>
                    <View style={styles.specGrid}>
                      <View style={styles.specItem}>
                        <Text style={styles.specLabel}>Quantity</Text>
                        <Text style={styles.specValue}>{item.quantity} {item.unitType}</Text>
                      </View>
                      {item.dimensions && (item.dimensions.l || item.dimensions.w || item.dimensions.h) && (
                        <View style={styles.specItem}>
                          <Text style={styles.specLabel}>Size (L x W x H)</Text>
                          <Text style={styles.specValue}>{item.dimensions.l}" x {item.dimensions.w}" x {item.dimensions.h}"</Text>
                        </View>
                      )}
                      {item.material && (
                        <View style={styles.specItem}>
                          <Text style={styles.specLabel}>Material</Text>
                          <Text style={styles.specValue}>{item.material}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        <View wrap={false} style={styles.summaryTable}>
          <Text style={styles.summaryTitle}>Financial Summary</Text>
          {totals.lines.filter(l => Math.abs(l.value) > 0 || l.isLast).map((line: TotalsLine) => (
            <View key={line.key} style={styles.summaryRow}>
              <Text style={{ fontSize: 9, color: line.emphasis ? "#8a3535" : "#666", fontWeight: line.emphasis ? 700 : 500 }}>{line.label}</Text>
              <Text style={{ fontSize: 10, color: line.emphasis ? "#8a3535" : "#1a1a1a", fontWeight: 700 }}>{money(line.value)}</Text>
            </View>
          ))}
          <View style={styles.summaryGrand}>
            <Text style={styles.summaryGrandLabel}>GRAND TOTAL (INR)</Text>
            <Text style={styles.summaryGrandValue}>{money(totals.grandTotal)}</Text>
          </View>
        </View>

        {terms?.length > 0 && (
          <View wrap={false} style={styles.tnc}>
            <Text style={styles.tncTitle}>Terms & Conditions</Text>
            {terms.map((term, i) => (
              <Text key={i} style={styles.tncText}>{i + 1}. {term}</Text>
            ))}
          </View>
        )}

        <View fixed style={styles.footer}>
          <View style={styles.footerLinks}>
            <Text style={styles.linkText}>shop.maplefurnishers.com</Text>
            <Text style={styles.linkText}>Instagram: @maple_furnishers</Text>
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Proposal | Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
