import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 11, marginBottom: 12, color: "#555555" },
  headerBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  headerCol: { flexDirection: "column" },
  headerLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#555555", marginBottom: 2 },
  headerValue: { fontSize: 11 },
  blankLine: { borderBottomWidth: 1, borderBottomColor: "#000000", minWidth: 90, height: 14 },
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
  colGroupLabel: { flex: 2, textAlign: "center", fontSize: 8, color: "#555555" },
  colSmall: { flex: 1, textAlign: "center" },
});

type CountSheetProduct = { sku: string; description: string };
type CountSheetArea = { name: string; products: CountSheetProduct[] };

export function CountSheetDocument({
  locationName,
  yellowDogCode,
  eventName,
  eventDate,
  leadName,
  estTickets,
  areas,
}: {
  locationName: string;
  yellowDogCode: string | null;
  eventName: string | null;
  eventDate: string | null;
  leadName: string | null;
  estTickets: number | null;
  areas: CountSheetArea[];
}) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>
          {yellowDogCode ? `${yellowDogCode} — ` : ""}
          {locationName} — Count Sheet
        </Text>
        {eventName ? (
          <Text style={styles.subtitle}>
            {eventName} · {eventDate}
          </Text>
        ) : (
          <Text style={styles.subtitle}>Blank template — not tied to a specific event</Text>
        )}

        <View style={styles.headerBox}>
          <View style={styles.headerCol}>
            <Text style={styles.headerLabel}>EVENT</Text>
            {eventName ? <Text style={styles.headerValue}>{eventName}</Text> : <View style={styles.blankLine} />}
          </View>
          <View style={styles.headerCol}>
            <Text style={styles.headerLabel}>DATE</Text>
            {eventDate ? <Text style={styles.headerValue}>{eventDate}</Text> : <View style={styles.blankLine} />}
          </View>
          <View style={styles.headerCol}>
            <Text style={styles.headerLabel}>LEAD</Text>
            {leadName ? <Text style={styles.headerValue}>{leadName}</Text> : <View style={styles.blankLine} />}
          </View>
          <View style={styles.headerCol}>
            <Text style={styles.headerLabel}>EST ATTENDANCE</Text>
            {estTickets != null ? <Text style={styles.headerValue}>{estTickets}</Text> : <View style={styles.blankLine} />}
          </View>
          <View style={styles.headerCol}>
            <Text style={styles.headerLabel}>TOT ATTENDANCE</Text>
            <View style={styles.blankLine} />
          </View>
        </View>

        {areas.map((area) => (
          <View key={area.name}>
            <Text style={styles.areaTitle}>{area.name}</Text>
            <View style={styles.thRow}>
              <Text style={styles.colProduct}>Product</Text>
              <Text style={styles.colGroupLabel}>Opening</Text>
              <Text style={styles.colGroupLabel}>Closing</Text>
            </View>
            <View style={styles.thRow}>
              <Text style={styles.colProduct}></Text>
              <Text style={styles.colSmall}>EA</Text>
              <Text style={styles.colSmall}>CS</Text>
              <Text style={styles.colSmall}>EA</Text>
              <Text style={styles.colSmall}>CS</Text>
            </View>
            {area.products.map((p) => (
              <View key={p.sku} style={styles.tr}>
                <Text style={styles.colProduct}>{p.description}</Text>
                <Text style={styles.colSmall}></Text>
                <Text style={styles.colSmall}></Text>
                <Text style={styles.colSmall}></Text>
                <Text style={styles.colSmall}></Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
