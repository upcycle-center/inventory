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

type MonthEndProduct = { sku: string; description: string; middle_unit_label?: string | null; each_countable?: boolean };
type MonthEndCategory = { name: string; products: MonthEndProduct[] };

// The blank worksheet page for one location -- exported on its own so a
// combined all-locations PDF can render one per location inside a single
// Document, instead of duplicating this layout.
export function MonthEndCountSheetPage({
  locationName,
  yellowDogCode,
  monthLabel,
  categories,
  newItemRows = 8,
}: {
  locationName: string;
  yellowDogCode: string | null;
  monthLabel: string;
  categories: MonthEndCategory[];
  newItemRows?: number;
}) {
  return (
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

      {categories.map((category) => (
        <View key={category.name}>
          <Text style={styles.areaTitle}>{category.name}</Text>
          <View style={styles.thRow}>
            <Text style={styles.colProduct}>Product</Text>
            <Text style={styles.colBox}>Cases</Text>
            <Text style={styles.colBox}>Middle Unit</Text>
            <Text style={styles.colBox}>Each</Text>
          </View>
          {category.products.map((p) => (
            <View key={p.sku} style={styles.tr}>
              <Text style={styles.colProduct}>{p.description}</Text>
              <Text style={styles.colBox}></Text>
              <Text style={styles.colBox}>{p.middle_unit_label ? `(${p.middle_unit_label})` : ""}</Text>
              <Text style={styles.colBox}>{p.each_countable === false ? "N/A" : ""}</Text>
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
  );
}

export function MonthEndCountSheetDocument(props: {
  locationName: string;
  yellowDogCode: string | null;
  monthLabel: string;
  categories: MonthEndCategory[];
  newItemRows?: number;
}) {
  return (
    <Document>
      <MonthEndCountSheetPage {...props} />
    </Document>
  );
}

// One combined download covering every active location -- each gets its
// own page, same blank Category-grouped layout as the single-location
// sheet, instead of downloading one location at a time.
export function AllMonthEndCountSheetsDocument({
  monthLabel,
  locations,
}: {
  monthLabel: string;
  locations: { locationName: string; yellowDogCode: string | null; categories: MonthEndCategory[] }[];
}) {
  return (
    <Document>
      {locations.map((loc) => (
        <MonthEndCountSheetPage
          key={loc.locationName}
          locationName={loc.locationName}
          yellowDogCode={loc.yellowDogCode}
          monthLabel={monthLabel}
          categories={loc.categories}
        />
      ))}
    </Document>
  );
}
