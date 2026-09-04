import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  titleCol: { flex: 1, paddingRight: 12 },
  title: { fontSize: 16, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  eventLine: { fontSize: 14, marginBottom: 4, color: "#555555" },
  eventLineMuted: { fontSize: 11, marginBottom: 4, color: "#555555" },
  attendanceLine: { fontSize: 10 },
  qrRow: { flexDirection: "row", alignItems: "flex-start" },
  qrImage: { width: 60, height: 60, marginLeft: 8 },
  qrStepsBox: {
    width: 178,
    borderWidth: 1,
    borderColor: "#000000",
    padding: 6,
  },
  qrStepsTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textDecoration: "underline",
    textAlign: "center",
    marginBottom: 4,
  },
  qrStepLine: { fontSize: 7, lineHeight: 1.5 },
  qrStepEmphasis: { fontFamily: "Helvetica-Bold", textDecoration: "underline" },
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
    fontSize: 7,
  },
  thRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000000",
    paddingVertical: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
  },
  tr: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000000",
    paddingVertical: 4,
  },
  // Product is a fixed width -- the same on every area's table on the
  // page, liquor/wine's extra Empty column and all -- so the count boxes
  // always start at the same X down the page instead of drifting per area.
  // Wide enough for the longest real descriptions on one line.
  colProduct: { width: 260, paddingLeft: 3, fontSize: 8.5 },
  // OPEN/CLOSE header spans its two boxes below (80 = 40 + 40).
  colGroupLabel: { width: 80, textAlign: "center", fontSize: 7, color: "#555555", borderLeftWidth: 1, borderLeftColor: "#000000" },
  // Every count box (OPEN/CLOSE's EA+CS, and Waste/Comp/Empty) is this same
  // width -- big enough to actually hand-write a number into.
  colBox: { width: 40, textAlign: "center", fontSize: 7.5, borderLeftWidth: 1, borderLeftColor: "#000000" },
  commentSection: { marginTop: 20 },
  commentLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#555555", marginBottom: 6 },
  commentLine: { borderBottomWidth: 1, borderBottomColor: "#000000", height: 20 },
});

type CountSheetProduct = { sku: string; description: string };
type CountSheetArea = { name: string; products: CountSheetProduct[] };
type CountSheetRole = { name: string; count: number };

type CountSheetPageProps = {
  locationName: string;
  yellowDogCode: string | null;
  eventName: string | null;
  eventDate: string | null;
  leadName: string | null;
  totTickets: number | null;
  roles: CountSheetRole[];
  areas: CountSheetArea[];
  qrCodeDataUri: string | null;
};

// The single-location page, factored out so a combined multi-location PDF
// can render one of these per location inside one shared <Document> --
// each <Page> starts a fresh sheet, so this is otherwise identical to what
// the per-location download produces.
function CountSheetPage({
  locationName,
  yellowDogCode,
  eventName,
  eventDate,
  leadName,
  totTickets,
  roles,
  areas,
  qrCodeDataUri,
}: CountSheetPageProps) {
  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.topRow}>
        <View style={styles.titleCol}>
          <Text style={styles.title}>Count Sheet</Text>
          <Text style={styles.title}>
            {yellowDogCode ? `${yellowDogCode} — ` : ""}
            {locationName}
          </Text>
          {eventName ? (
            <Text style={styles.eventLine}>
              {eventName.toUpperCase()} · {eventDate}
            </Text>
          ) : (
            <Text style={styles.eventLineMuted}>Blank template — not tied to a specific event</Text>
          )}
          <Text style={styles.attendanceLine}>ATTENDANCE: {totTickets != null ? totTickets : "____________"}</Text>
        </View>

        {qrCodeDataUri && (
          <View style={styles.qrRow}>
            <View style={styles.qrStepsBox}>
              <Text style={styles.qrStepsTitle}>SCAN QR TO OPEN/CLOSE STAND</Text>
              <Text style={styles.qrStepLine}>
                1) SUBMIT <Text style={styles.qrStepEmphasis}>OPENING COUNT</Text> upon arrival.
              </Text>
              <Text style={styles.qrStepLine}>
                2) TRACK <Text style={styles.qrStepEmphasis}>WASTE/COMPS</Text> during event.
              </Text>
              <Text style={styles.qrStepLine}>
                3) SUBMIT <Text style={styles.qrStepEmphasis}>WASTE, COMPS and CLOSING COUNT</Text> at the end of
                event.
              </Text>
              <Text style={styles.qrStepLine}>
                4) RETURN <Text style={styles.qrStepEmphasis}>PAPER COPY</Text> to the office.
              </Text>
            </View>
            <Image src={qrCodeDataUri} style={styles.qrImage} />
          </View>
        )}
      </View>

      <View style={[styles.headerBox, { marginTop: 12 }]}>
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
            <Text style={styles.colBox}>Waste</Text>
            <Text style={styles.colBox}>Comp</Text>
            {showEmpty && <Text style={styles.colBox}>Empty</Text>}
            <Text style={styles.colGroupLabel}>CLOSE</Text>
          </View>
          <View style={styles.thRow}>
            <Text style={styles.colProduct}></Text>
            <Text style={styles.colBox}>EA</Text>
            <Text style={styles.colBox}>CS</Text>
            <Text style={styles.colBox}>EA</Text>
            <Text style={styles.colBox}>EA</Text>
            {showEmpty && <Text style={styles.colBox}>EA</Text>}
            <Text style={styles.colBox}>EA</Text>
            <Text style={styles.colBox}>CS</Text>
          </View>
          {area.products.map((p) => (
            <View key={p.sku} style={styles.tr}>
              <Text style={styles.colProduct}>{p.description}</Text>
              <Text style={styles.colBox}></Text>
              <Text style={styles.colBox}></Text>
              <Text style={styles.colBox}></Text>
              <Text style={styles.colBox}></Text>
              {showEmpty && <Text style={styles.colBox}></Text>}
              <Text style={styles.colBox}></Text>
              <Text style={styles.colBox}></Text>
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
  );
}

export function CountSheetDocument(props: CountSheetPageProps) {
  return (
    <Document>
      <CountSheetPage {...props} />
    </Document>
  );
}

// One combined PDF -- every location's count sheet as its own page in
// page order, for handing out a single printout at staff check-in instead
// of downloading each stand separately.
export function AllCountSheetsDocument({ locations }: { locations: CountSheetPageProps[] }) {
  return (
    <Document>
      {locations.map((loc, i) => (
        <CountSheetPage key={i} {...loc} />
      ))}
    </Document>
  );
}
