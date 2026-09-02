import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { InventoryReportRow } from "@/lib/inventoryReport";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 11, marginBottom: 12, color: "#555555" },
  areaTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: "#f0f0f0",
    padding: 4,
  },
  thRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingVertical: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#dddddd", paddingVertical: 4 },
  colProduct: { flex: 3 },
  colSmall: { flex: 1, textAlign: "right" },
});

function fmtCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function fmtQty(each: number | null, cases: number | null) {
  const parts = [];
  if (each != null) parts.push(`${each} EA`);
  if (cases != null) parts.push(`${cases} CS`);
  return parts.join(", ") || "—";
}

export function InventoryReportDocument({ rows, generatedAt }: { rows: InventoryReportRow[]; generatedAt: string }) {
  const byLocation = new Map<string, InventoryReportRow[]>();
  for (const r of rows) {
    const list = byLocation.get(r.location) ?? [];
    list.push(r);
    byLocation.set(r.location, list);
  }
  const totalCost = rows.reduce((sum, r) => sum + r.costValue, 0);
  const totalRetail = rows.reduce((sum, r) => sum + r.retailValue, 0);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Inventory Value Report</Text>
        <Text style={styles.subtitle}>
          Generated {generatedAt} · Cost {fmtCurrency(totalCost)} · Retail {fmtCurrency(totalRetail)}
        </Text>

        {[...byLocation.entries()].map(([location, items]) => (
          <View key={location}>
            <Text style={styles.areaTitle}>{location}</Text>
            <View style={styles.thRow}>
              <Text style={styles.colProduct}>Product</Text>
              <Text style={styles.colSmall}>On-Hand</Text>
              <Text style={styles.colSmall}>Cost Value</Text>
              <Text style={styles.colSmall}>Retail Value</Text>
            </View>
            {items.map((r) => (
              <View key={r.sku} style={styles.tr}>
                <Text style={styles.colProduct}>{r.description}</Text>
                <Text style={styles.colSmall}>{fmtQty(r.qtyEach, r.qtyCases)}</Text>
                <Text style={styles.colSmall}>{fmtCurrency(r.costValue)}</Text>
                <Text style={styles.colSmall}>{fmtCurrency(r.retailValue)}</Text>
              </View>
            ))}
          </View>
        ))}

        {!rows.length && <Text>No on-hand inventory on record yet.</Text>}
      </Page>
    </Document>
  );
}
