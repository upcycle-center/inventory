import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  titleCol: { flex: 1, paddingRight: 12 },
  title: { fontSize: 16, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  monthLine: { fontSize: 15, marginBottom: 2, fontFamily: "Helvetica-Bold", color: "#000000" },
  locationLine: { fontSize: 12, color: "#555555" },
  qrRow: { flexDirection: "row", alignItems: "flex-start" },
  qrImage: { width: 80, height: 80, marginLeft: 8 },
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
    marginTop: 12,
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
  vendorTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 8,
    marginBottom: 3,
    color: "#555555",
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
// middleUnitLabel is null for a Type with no middle-unit concept
// (Chargeable, Non-Chargeable -- Mixers) -- the column is dropped rather
// than shown empty. Bottles/Disposables rename it to Partials/Pack-Sleeve.
type MonthEndTypeGroup = { name: string; middleUnitLabel: string | null; products: MonthEndProduct[] };

function QrBox({ qrCodeDataUri, generic }: { qrCodeDataUri: string | null; generic?: boolean }) {
  if (!qrCodeDataUri) return null;
  return (
    <View style={styles.qrRow}>
      <View style={styles.qrStepsBox}>
        <Text style={styles.qrStepsTitle}>{generic ? "SCAN QR TO ENTER THIS COUNT" : "SCAN QR FOR LOCATION ACCESS"}</Text>
        {generic ? (
          <>
            <Text style={styles.qrStepLine}>
              1) Opens the <Text style={styles.qrStepEmphasis}>MONTH-END COUNT</Text> entry form.
            </Text>
            <Text style={styles.qrStepLine}>
              2) SELECT the <Text style={styles.qrStepEmphasis}>LOCATION</Text> this sheet is for.
            </Text>
            <Text style={styles.qrStepLine}>3) Enter quantities from this sheet, then SUBMIT.</Text>
            <Text style={styles.qrStepLine}>
              4) RETURN <Text style={styles.qrStepEmphasis}>PAPER COPY</Text> to the office.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.qrStepLine}>Opens this location&apos;s check-in hub.</Text>
            <Text style={styles.qrStepLine}>
              1) Select <Text style={styles.qrStepEmphasis}>MONTH-END COUNT</Text> from there.
            </Text>
            <Text style={styles.qrStepLine}>2) Enter quantities from this sheet, then SUBMIT.</Text>
            <Text style={styles.qrStepLine}>
              3) RETURN <Text style={styles.qrStepEmphasis}>PAPER COPY</Text> to the office.
            </Text>
          </>
        )}
      </View>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/alt-text -- react-pdf's Image has no alt prop */}
      <Image src={qrCodeDataUri} style={styles.qrImage} />
    </View>
  );
}

function LocationHeader({
  locationName,
  yellowDogCode,
  monthLabel,
  qrCodeDataUri,
}: {
  locationName: string;
  yellowDogCode: string | null;
  monthLabel: string;
  qrCodeDataUri: string | null;
}) {
  return (
    <View style={styles.topRow}>
      <View style={styles.titleCol}>
        <Text style={styles.title}>Month-End Count Sheet</Text>
        <Text style={styles.monthLine}>{monthLabel}</Text>
        <Text style={styles.locationLine}>
          {yellowDogCode ? `${yellowDogCode} — ` : ""}
          {locationName}
        </Text>
      </View>
      <QrBox qrCodeDataUri={qrCodeDataUri} />
    </View>
  );
}

// One location's worksheet, split across two physical pages so a table
// never breaks mid-row across a page boundary: the product tables first,
// then New/Unlisted Items + Comments on their own page -- each page
// repeats the same title/month/location header so the location is still
// identifiable if the pages get separated when printed. Exported on its
// own so a combined all-locations PDF can render one location's pair of
// pages inside a single Document, instead of duplicating this layout.
export function MonthEndCountSheetPage({
  locationName,
  yellowDogCode,
  monthLabel,
  typeGroups,
  qrCodeDataUri = null,
  newItemRows = 8,
}: {
  locationName: string;
  yellowDogCode: string | null;
  monthLabel: string;
  typeGroups: MonthEndTypeGroup[];
  qrCodeDataUri?: string | null;
  newItemRows?: number;
}) {
  return (
    <>
      <Page size="LETTER" style={styles.page}>
        <LocationHeader locationName={locationName} yellowDogCode={yellowDogCode} monthLabel={monthLabel} qrCodeDataUri={qrCodeDataUri} />

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

        {typeGroups.map((group) => (
          <View key={group.name}>
            <Text style={styles.areaTitle}>{group.name}</Text>
            <View style={styles.thRow}>
              <Text style={styles.colProduct}>Product</Text>
              <Text style={styles.colBox}>Cases</Text>
              {group.middleUnitLabel && <Text style={styles.colBox}>{group.middleUnitLabel}</Text>}
              <Text style={styles.colBox}>Each</Text>
            </View>
            {group.products.map((p) => (
              <View key={p.sku} style={styles.tr}>
                <Text style={styles.colProduct}>{p.description}</Text>
                <Text style={styles.colBox}></Text>
                {group.middleUnitLabel && <Text style={styles.colBox}></Text>}
                <Text style={styles.colBox}>{p.each_countable === false ? "N/A" : ""}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>

      <Page size="LETTER" style={styles.page}>
        <LocationHeader locationName={locationName} yellowDogCode={yellowDogCode} monthLabel={monthLabel} qrCodeDataUri={qrCodeDataUri} />

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
    </>
  );
}

export function MonthEndCountSheetDocument(props: {
  locationName: string;
  yellowDogCode: string | null;
  monthLabel: string;
  typeGroups: MonthEndTypeGroup[];
  qrCodeDataUri?: string | null;
  newItemRows?: number;
}) {
  return (
    <Document>
      <MonthEndCountSheetPage {...props} />
    </Document>
  );
}

// One combined download covering every active location -- each gets its
// own page, same blank Product-Type-grouped layout as the single-location
// sheet, instead of downloading one location at a time.
export function AllMonthEndCountSheetsDocument({
  monthLabel,
  locations,
}: {
  monthLabel: string;
  locations: { locationName: string; yellowDogCode: string | null; typeGroups: MonthEndTypeGroup[]; qrCodeDataUri: string | null }[];
}) {
  return (
    <Document>
      {locations.map((loc) => (
        <MonthEndCountSheetPage
          key={loc.locationName}
          locationName={loc.locationName}
          yellowDogCode={loc.yellowDogCode}
          monthLabel={monthLabel}
          typeGroups={loc.typeGroups}
          qrCodeDataUri={loc.qrCodeDataUri}
        />
      ))}
    </Document>
  );
}

type VendorGroup = { name: string; products: MonthEndProduct[] };
// middleUnitLabel is null for a Type that has no middle-unit concept
// (Chargeable, Non-Chargeable -- Mixers) -- the column is dropped rather
// than shown empty. Bottles/Disposables rename it to Partials/Pack-Sleeve.
type TypeSection = { typeLabel: string; middleUnitLabel: string | null; vendors: VendorGroup[] };

// The generic/blank sheet -- not tied to any one location, so instead of
// Category sections it's organized Product Type -> Vendor -> Product
// (alphabetical), one Type per page so a clear break separates each as
// they're handed to different people/stations to count.
export function GenericMonthEndCountSheetDocument({
  monthLabel,
  typeSections,
  qrCodeDataUri = null,
}: {
  monthLabel: string;
  typeSections: TypeSection[];
  qrCodeDataUri?: string | null;
}) {
  return (
    <Document>
      {typeSections.map((section) => (
        <Page key={section.typeLabel} size="LETTER" style={styles.page}>
          <View style={styles.topRow}>
            <View style={styles.titleCol}>
              <Text style={styles.title}>Month-End Count Sheet</Text>
              <Text style={styles.monthLine}>{monthLabel}</Text>
              <Text style={styles.locationLine}>{section.typeLabel}</Text>
            </View>
            <QrBox qrCodeDataUri={qrCodeDataUri} generic />
          </View>

          <View style={styles.headerBox}>
            <View style={styles.headerCol}>
              <Text style={styles.headerLabel}>LOCATION</Text>
              <View style={styles.blankLine} />
            </View>
            <View style={styles.headerCol}>
              <Text style={styles.headerLabel}>COUNTED BY</Text>
              <View style={styles.blankLine} />
            </View>
            <View style={styles.headerCol}>
              <Text style={styles.headerLabel}>DATE</Text>
              <View style={styles.blankLine} />
            </View>
          </View>

          {section.vendors.map((vendor) => (
            <View key={vendor.name}>
              <Text style={styles.vendorTitle}>{vendor.name}</Text>
              <View style={styles.thRow}>
                <Text style={styles.colProduct}>Product</Text>
                <Text style={styles.colBox}>Cases</Text>
                {section.middleUnitLabel && <Text style={styles.colBox}>{section.middleUnitLabel}</Text>}
                <Text style={styles.colBox}>Each</Text>
              </View>
              {vendor.products.map((p) => (
                <View key={p.sku} style={styles.tr}>
                  <Text style={styles.colProduct}>{p.description}</Text>
                  <Text style={styles.colBox}></Text>
                  {section.middleUnitLabel && <Text style={styles.colBox}></Text>}
                  <Text style={styles.colBox}>{p.each_countable === false ? "N/A" : ""}</Text>
                </View>
              ))}
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
