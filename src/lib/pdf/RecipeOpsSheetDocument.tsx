import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { ML_PER_OZ, RECIPE_SIZE_DEFS, resolveIngredientsForSize, type RecipeIngredientLine, type RecipeSizeResult } from "@/lib/recipeCost";
import { PRODUCT_TYPE_OPTIONS } from "@/lib/productType";

export interface OpsSheetIngredientLine extends RecipeIngredientLine {
  bottleSizeMl: number | null;
  productType: string;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  title: { fontSize: 18, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 11, color: "#555555" },
  printedAt: { fontSize: 9, color: "#555555" },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
    backgroundColor: "#f0f0f0",
    padding: 4,
  },
  instructionsText: { fontSize: 10, lineHeight: 1.5 },
  howToRow: { flexDirection: "row" },
  howToCol: { flex: 1 },
  howToColRight: { flex: 1, marginLeft: 16 },
  sourceUrl: { fontSize: 8, color: "#555555", marginTop: 6 },
  thRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000000",
    paddingVertical: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  groupRow: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 3,
    paddingLeft: 4,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000000",
  },
  groupLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: "#333333" },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000000",
    paddingVertical: 5,
  },
  colProduct: { flex: 2, flexDirection: "row", alignItems: "center", paddingLeft: 4 },
  checkbox: { width: 8, height: 8, borderWidth: 1, borderColor: "#000000", marginRight: 6 },
  colBatch: { flex: 1, textAlign: "center", borderLeftWidth: 1, borderLeftColor: "#000000" },
  colServing: { flex: 1.5, paddingLeft: 4 },
  colCost: { flex: 1, textAlign: "center", borderLeftWidth: 1, borderLeftColor: "#000000" },
  beoText: { color: "#1d4ed8" },
  msrpText: { color: "#15803d" },
});

function fmtCurrency(value: number | null) {
  return value == null ? "—" : `$${value.toFixed(2)}`;
}

function fmtRounded(value: number | null) {
  return value == null ? "—" : `$${Math.ceil(value)}`;
}

// Whole units (bottles/cans) needed to cover the resolved oz for a batch
// size, rounded up, shown with the bottle size so it's clear what's
// being counted (e.g. "4 × 750ml") -- you can't pull a fraction of a
// bottle, and this list exists to say how many bottles to pull.
function fmtBottleCount(oz: number, bottleSizeMl: number | null) {
  if (!(oz > 0) || !bottleSizeMl) return "—";
  const bottleSizeOz = bottleSizeMl / ML_PER_OZ;
  if (!bottleSizeOz) return "—";
  const units = Math.ceil(oz / bottleSizeOz);
  return `${units} × ${Math.round(bottleSizeMl)}ml`;
}

function fmtOz(oz: number) {
  return oz > 0 ? `${oz.toFixed(2)} oz` : "—";
}

export function RecipeOpsSheetDocument({
  name,
  description,
  category,
  instructions,
  originalRecipe,
  sourceUrl,
  ingredients,
  costSizes,
  generatedAt,
}: {
  name: string;
  description: string | null;
  category: string | null;
  instructions: string | null;
  originalRecipe: string | null;
  sourceUrl: string | null;
  ingredients: OpsSheetIngredientLine[];
  costSizes: RecipeSizeResult[];
  generatedAt: string;
}) {
  const literOz = Object.fromEntries(resolveIngredientsForSize(ingredients, "liter").map((l) => [l.productId, l.quantityOz]));
  const bubblerOz = Object.fromEntries(
    resolveIngredientsForSize(ingredients, "batch_2_5_gal").map((l) => [l.productId, l.quantityOz])
  );
  const subtitle = [description, category].filter(Boolean).join(" · ");

  // Grouped by Product Type, in the same fixed order as the Products
  // tabs -- only groups that actually have ingredients are shown.
  const groups = PRODUCT_TYPE_OPTIONS.map((opt) => ({
    label: opt.shortLabel,
    items: ingredients.filter((i) => i.productType === opt.value),
  })).filter((g) => g.items.length > 0);

  const literLabel = RECIPE_SIZE_DEFS.find((s) => s.key === "liter")?.label ?? "1L";
  const bubblerLabel = RECIPE_SIZE_DEFS.find((s) => s.key === "batch_2_5_gal")?.label ?? "2.5gal";

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{name}</Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          <Text style={styles.printedAt}>Printed {generatedAt}</Text>
        </View>

        <View style={styles.howToRow}>
          <View style={styles.howToCol}>
            <Text style={styles.sectionTitle}>RECIPE</Text>
            <Text style={styles.instructionsText}>{originalRecipe || "No original recipe on file."}</Text>
            {sourceUrl && <Text style={styles.sourceUrl}>Source: {sourceUrl}</Text>}
          </View>
          <View style={styles.howToColRight}>
            <Text style={styles.sectionTitle}>SERVICE</Text>
            <Text style={styles.instructionsText}>{instructions || "No instructions on file."}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>BATCH PICK LIST</Text>
        <View style={styles.thRow}>
          <Text style={styles.colProduct}>Ingredient</Text>
          <Text style={styles.colBatch}>{literLabel} Batch</Text>
          <Text style={styles.colBatch}>{bubblerLabel} Batch</Text>
        </View>
        {groups.map((group) => (
          <View key={group.label}>
            <View style={styles.groupRow}>
              <Text style={styles.groupLabel}>{group.label}</Text>
            </View>
            {group.items.map((ing) => (
              <View key={ing.productId} style={styles.tr}>
                <View style={styles.colProduct}>
                  <View style={styles.checkbox} />
                  <Text>
                    {ing.description}
                    {ing.quantityOz == null ? " (Top Off)" : ""}
                  </Text>
                </View>
                <Text style={styles.colBatch}>{fmtBottleCount(literOz[ing.productId] ?? 0, ing.bottleSizeMl)}</Text>
                <Text style={styles.colBatch}>{fmtBottleCount(bubblerOz[ing.productId] ?? 0, ing.bottleSizeMl)}</Text>
              </View>
            ))}
          </View>
        ))}
        {!ingredients.length && <Text style={styles.instructionsText}>No ingredients on file.</Text>}

        {!!ingredients.length && (
          <>
            <Text style={styles.sectionTitle}>BATCH SERVICE</Text>
            <View style={styles.thRow}>
              <Text style={styles.colProduct}>Ingredient</Text>
              <Text style={styles.colBatch}>{literLabel} Batch</Text>
              <Text style={styles.colBatch}>{bubblerLabel} Batch</Text>
            </View>
            {ingredients.map((ing) => (
              <View key={ing.productId} style={styles.tr}>
                <Text style={[styles.colProduct, { paddingLeft: 4 }]}>
                  {ing.description}
                  {ing.quantityOz == null ? " (Top Off)" : ""}
                </Text>
                <Text style={styles.colBatch}>{fmtOz(literOz[ing.productId] ?? 0)}</Text>
                <Text style={styles.colBatch}>{fmtOz(bubblerOz[ing.productId] ?? 0)}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>COST / BEO / MSRP</Text>
        <View style={styles.thRow}>
          <Text style={styles.colServing}>Serving</Text>
          <Text style={styles.colCost}>Cost</Text>
          <Text style={styles.colCost}>BEO</Text>
          <Text style={styles.colCost}>MSRP</Text>
        </View>
        {costSizes.map((s) => (
          <View key={s.key} style={styles.tr}>
            <Text style={styles.colServing}>{s.label}</Text>
            <Text style={styles.colCost}>{fmtCurrency(s.cost)}</Text>
            <Text style={[styles.colCost, styles.beoText]}>{fmtRounded(s.beo)}</Text>
            <Text style={[styles.colCost, styles.msrpText]}>{fmtRounded(s.msrp)}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
