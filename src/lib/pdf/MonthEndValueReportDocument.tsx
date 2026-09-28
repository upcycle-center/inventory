import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { MonthEndValueGroup } from "@/lib/monthEndValue";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 11, marginBottom: 12, color: "#555555" },
  categoryTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: "#e5e5e5",
    padding: 4,
  },
  locationTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
    marginBottom: 2,
    backgroundColor: "#f4f4f4",
    padding: 3,
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
  grandTotal: { marginTop: 16, fontFamily: "Helvetica-Bold", fontSize: 11, textAlign: "right" },
});

function fmtCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function fmtQty(each: number | null, cases: number | null, middle?: number | null, middleUnitLabel?: string | null) {
  const parts = [];
  if (each != null) parts.push(`${each} EA`);
  if (cases != null) parts.push(`${cases} CS`);
  if (middle && middleUnitLabel) parts.push(`${middle} ${middleUnitLabel}`);
  return parts.join(", ") || "—";
}

// Always laid out Category -> Location -> product lines, regardless of
// what grouping is active on screen -- a fixed, predictable structure for
// a printed/saved document, independent of whatever ad-hoc slice someone
// was looking at when they hit "Download PDF".
export function MonthEndValueReportDocument({
  title,
  monthLabel,
  groups,
  grandTotal,
}: {
  title: string;
  monthLabel: string;
  groups: MonthEndValueGroup[];
  grandTotal: number;
}) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {monthLabel} · By Category · Grand Total {fmtCurrency(grandTotal)}
        </Text>

        {groups.map((group) => (
          <View key={group.id}>
            <Text style={styles.categoryTitle}>
              {group.name} — {fmtCurrency(group.subtotal)}
            </Text>
            {group.subgroups.map((subgroup) => (
              <View key={subgroup.id}>
                <Text style={styles.locationTitle}>
                  {subgroup.name} — {fmtCurrency(subgroup.subtotal)}
                </Text>
                <View style={styles.thRow}>
                  <Text style={styles.colProduct}>Product</Text>
                  <Text style={styles.colSmall}>Qty</Text>
                  <Text style={styles.colSmall}>Value</Text>
                </View>
                {subgroup.lines.map((line) => (
                  <View key={`${line.productId}:${line.locationId}`} style={styles.tr}>
                    <Text style={styles.colProduct}>{line.description}</Text>
                    <Text style={styles.colSmall}>{fmtQty(line.qtyEach, line.qtyCases, line.qtyMiddleUnit, line.middleUnitLabel)}</Text>
                    <Text style={styles.colSmall}>{fmtCurrency(line.value)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}

        {!groups.length && <Text>No month-end counts posted for this month yet.</Text>}
        {!!groups.length && <Text style={styles.grandTotal}>Grand Total: {fmtCurrency(grandTotal)}</Text>}
      </Page>
    </Document>
  );
}
