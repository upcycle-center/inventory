import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 11, marginBottom: 4, color: "#555555" },
  attendanceLine: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 12 },
  headerBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  headerCol: { flexDirection: "column" },
  headerColWide: { flexDirection: "column", flex: 1, marginLeft: 16 },
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
  thHeadRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000000",
    borderBottomWidth: 0,
    paddingVertical: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  thRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000000",
    paddingVertical: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tr: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000000",
    paddingVertical: 4,
  },
  colProduct: { flex: 3, paddingLeft: 3 },
  colGroupLabel: { flex: 2, textAlign: "center", fontSize: 8, color: "#555555", borderLeftWidth: 1, borderLeftColor: "#000000" },
  colSmall: { flex: 1, textAlign: "center", borderLeftWidth: 1, borderLeftColor: "#000000" },
  commentSection: { marginTop: 20 },
  commentLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#555555", marginBottom: 6 },
  commentLine: { borderBottomWidth: 1, borderBottomColor: "#000000", height: 20 },
});

type CountSheetProduct = { sku: string; description: string };
type CountSheetArea = { name: string; products: CountSheetProduct[] };
type CountSheetRole = { name: string; count: number };

export function CountSheetDocument({
  locationName,
  yellowDogCode,
  eventName,
  eventDate,
  leadName,
  estTickets,
  roles,
  areas,
}: {
  locationName: string;
  yellowDogCode: string | null;
  eventName: string | null;
  eventDate: string | null;
  leadName: string | null;
  estTickets: number | null;
  roles: CountSheetRole[];
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
        <Text style={styles.attendanceLine}>EST ATTENDANCE: {estTickets != null ? estTickets : "____________"}</Text>

        <View style={styles.headerBox}>
          <View style={styles.headerCol}>
            <Text style={styles.headerLabel}>LEAD</Text>
            {leadName ? <Text style={styles.headerValue}>{leadName}</Text> : <View style={styles.blankLine} />}
          </View>
          {roles.length > 0 && (
            <View style={styles.headerColWide}>
              <Text style={styles.headerLabel}>CONFIRMED TEAM</Text>
              <Text style={styles.headerValue}>{roles.map((r) => `${r.count} ${r.name}`).join("  ·  ")}</Text>
            </View>
          )}
        </View>

        {areas.map((area) => {
          const showEmpty = /liquor|wine/i.test(area.name);
          return (
          <View key={area.name}>
            <Text style={styles.areaTitle}>{area.name}</Text>
            <View style={styles.thHeadRow}>
              <Text style={styles.colProduct}>Product</Text>
              <Text style={styles.colGroupLabel}>OPEN</Text>
              <Text style={styles.colSmall}>Waste</Text>
              <Text style={styles.colSmall}>Comp</Text>
              {showEmpty && <Text style={styles.colSmall}>Empty</Text>}
              <Text style={styles.colGroupLabel}>CLOSE</Text>
            </View>
            <View style={styles.thRow}>
              <Text style={styles.colProduct}></Text>
              <Text style={styles.colSmall}>EA</Text>
              <Text style={styles.colSmall}>CS</Text>
              <Text style={styles.colSmall}>EA</Text>
              <Text style={styles.colSmall}>EA</Text>
              {showEmpty && <Text style={styles.colSmall}>EA</Text>}
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
                {showEmpty && <Text style={styles.colSmall}></Text>}
                <Text style={styles.colSmall}></Text>
                <Text style={styles.colSmall}></Text>
              </View>
            ))}
          </View>
          );
        })}

        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>COMMENTS</Text>
          <View style={styles.commentLine} />
          <View style={styles.commentLine} />
          <View style={styles.commentLine} />
        </View>
      </Page>
    </Document>
  );
}
