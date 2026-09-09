import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 14, marginBottom: 12, color: "#555555" },
  headerBox: {
    flexDirection: "row",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  headerCol: { flexDirection: "column", marginRight: 32 },
  headerLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#555555", marginBottom: 2 },
  blankLine: { borderBottomWidth: 1, borderBottomColor: "#000000", minWidth: 140, height: 14 },
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
    borderWidth: 1,
    borderColor: "#000000",
    paddingVertical: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tr: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000000",
    paddingVertical: 5,
  },
  colProduct: { width: 340, paddingLeft: 3, fontSize: 8.5 },
  colBox: { flex: 1, textAlign: "center", fontSize: 8, borderLeftWidth: 1, borderLeftColor: "#000000" },
  newItemsSection: { marginTop: 20 },
  newItemsTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  newItemsNote: { fontSize: 8, color: "#555555", marginBottom: 6 },
  niThRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000000",
    paddingVertical: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  niRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000000",
    height: 22,
  },
  niBarcode: { flex: 1.4, fontSize: 8 },
  niBrand: { flex: 1, borderLeftWidth: 1, borderLeftColor: "#000000", fontSize: 8 },
  niName: { flex: 1.6, borderLeftWidth: 1, borderLeftColor: "#000000", fontSize: 8 },
  niCase: { flex: 0.8, borderLeftWidth: 1, borderLeftColor: "#000000", fontSize: 8 },
  niSize: { flex: 1, borderLeftWidth: 1, borderLeftColor: "#000000", fontSize: 8 },
  commentSection: { marginTop: 20 },
  commentLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#555555", marginBottom: 6 },
  commentLine: { borderBottomWidth: 1, borderBottomColor: "#000000", height: 20 },
});

type MonthEndProduct = { sku: string; description: string };
type MonthEndArea = { name: string; products: MonthEndProduct[] };

export function MonthEndCountSheetDocument({
  locationName,
  yellowDogCode,
  monthLabel,
  areas,
  newItemRows = 8,
}: {
  locationName: string;
  yellowDogCode: string | null;
  monthLabel: string;
  areas: MonthEndArea[];
  newItemRows?: number;
}) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Month-End Count Sheet</Text>
        <Text style={styles.subtitle}>
          {yellowDogCode ? `${yellowDogCode} — ` : ""}
          {locationName} · {monthLabel}
        </Text>

        <View style={styles.headerBox}>
          <View style={styles.headerCol}>
            <Text style={styles.headerLabel}>COUNTED BY</Text>
            <View style={styles.blankLine} />
          </View>
          <View style={styles.headerCol}>
            <Text style={styles.headerLabel}>DATE</Text>
            <View style={styles.blankLine} />
          </View>
        </View>

        {areas.map((area) => (
          <View key={area.name}>
            <Text style={styles.areaTitle}>{area.name}</Text>
            <View style={styles.thRow}>
              <Text style={styles.colProduct}>Product</Text>
              <Text style={styles.colBox}>Cases</Text>
              <Text style={styles.colBox}>Each</Text>
            </View>
            {area.products.map((p) => (
              <View key={p.sku} style={styles.tr}>
                <Text style={styles.colProduct}>{p.description}</Text>
                <Text style={styles.colBox}></Text>
                <Text style={styles.colBox}></Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.newItemsSection}>
          <Text style={styles.newItemsTitle}>New / Unlisted Items</Text>
          <Text style={styles.newItemsNote}>
            Found on the shelf but not listed above? Write it in below — reported to a YellowDog
            manager to add to the catalog.
          </Text>
          <View style={styles.niThRow}>
            <Text style={styles.niBarcode}>Barcode</Text>
            <Text style={styles.niBrand}>Brand</Text>
            <Text style={styles.niName}>Product Name</Text>
            <Text style={styles.niCase}>Case Count</Text>
            <Text style={styles.niSize}>Size Each</Text>
          </View>
          {Array.from({ length: newItemRows }).map((_, i) => (
            <View key={i} style={styles.niRow}>
              <Text style={styles.niBarcode}></Text>
              <Text style={styles.niBrand}></Text>
              <Text style={styles.niName}></Text>
              <Text style={styles.niCase}></Text>
              <Text style={styles.niSize}></Text>
            </View>
          ))}
        </View>

        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>COMMENTS</Text>
          <View style={styles.commentLine} />
          <View style={styles.commentLine} />
        </View>
      </Page>
    </Document>
  );
}
