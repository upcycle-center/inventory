import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 12, marginBottom: 10, color: "#555555" },
  headerBox: {
    flexDirection: "row",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  headerCol: { flexDirection: "column", marginRight: 32 },
  headerLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#555555", marginBottom: 2 },
  headerValue: { fontSize: 11 },
  sectionTitle: {
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
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#dddddd", paddingVertical: 4, fontSize: 9 },
  colProduct: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  notesBox: { marginTop: 14 },
  notesLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#555555", marginBottom: 4 },
  notesText: { fontSize: 9 },
});

function fmtQty(each: number | null, cases: number | null) {
  const parts: string[] = [];
  if (cases) parts.push(`${cases} CS`);
  if (each) parts.push(`${each} EA`);
  return parts.join(", ") || "—";
}

type ConfirmationLine = { sku: string; description: string; qtyEach: number | null; qtyCases: number | null };
type WasteCompLine = { sku: string; description: string; quantity: number };

function LineTable({ lines }: { lines: WasteCompLine[] }) {
  return (
    <>
      <View style={styles.thRow}>
        <Text style={styles.colProduct}>Product</Text>
        <Text style={styles.colQty}>Qty</Text>
      </View>
      {lines.map((l) => (
        <View key={l.sku} style={styles.tr}>
          <Text style={styles.colProduct}>{l.description}</Text>
          <Text style={styles.colQty}>{l.quantity} EA</Text>
        </View>
      ))}
    </>
  );
}

export function CountConfirmationDocument({
  type,
  locationName,
  yellowDogCode,
  eventName,
  eventDate,
  submittedByName,
  submittedAt,
  lines,
  wasteLines,
  compLines,
  notes,
}: {
  type: "opening" | "closing";
  locationName: string;
  yellowDogCode: string | null;
  eventName: string | null;
  eventDate: string | null;
  submittedByName: string;
  submittedAt: string;
  lines: ConfirmationLine[];
  wasteLines: WasteCompLine[];
  compLines: WasteCompLine[];
  notes: string | null;
}) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{type === "closing" ? "Closing" : "Opening"} Count Confirmation</Text>
        <Text style={styles.subtitle}>
          {yellowDogCode ? `${yellowDogCode} — ` : ""}
          {locationName}
          {eventName ? ` · ${eventName}${eventDate ? ` (${eventDate})` : ""}` : ""}
        </Text>

        <View style={styles.headerBox}>
          <View style={styles.headerCol}>
            <Text style={styles.headerLabel}>SUBMITTED BY</Text>
            <Text style={styles.headerValue}>{submittedByName}</Text>
          </View>
          <View style={styles.headerCol}>
            <Text style={styles.headerLabel}>SUBMITTED AT</Text>
            <Text style={styles.headerValue}>{submittedAt}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Count</Text>
        <View style={styles.thRow}>
          <Text style={styles.colProduct}>Product</Text>
          <Text style={styles.colQty}>Qty</Text>
        </View>
        {lines.map((l) => (
          <View key={l.sku} style={styles.tr}>
            <Text style={styles.colProduct}>{l.description}</Text>
            <Text style={styles.colQty}>{fmtQty(l.qtyEach, l.qtyCases)}</Text>
          </View>
        ))}

        {wasteLines.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Waste</Text>
            <LineTable lines={wasteLines} />
          </>
        )}

        {compLines.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Comps</Text>
            <LineTable lines={compLines} />
          </>
        )}

        {notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>COMMENTS</Text>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
