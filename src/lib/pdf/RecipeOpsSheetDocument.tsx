import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  ML_PER_OZ,
  RECIPE_SIZE_DEFS,
  resolveMeasuredIngredientsForSize,
  type RecipeIngredientLine,
  type RecipeSizeResult,
} from "@/lib/recipeCost";
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
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "#f0f0f0",
    padding: 3,
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
    paddingVertical: 2,
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
    paddingVertical: 3,
  },
  colProduct: { flex: 2, flexDirection: "row", alignItems: "center", paddingLeft: 4 },
  checkbox: { width: 8, height: 8, borderWidth: 1, borderColor: "#000000", marginRight: 6 },
  colBatch: { flex: 1, textAlign: "center", borderLeftWidth: 1, borderLeftColor: "#000000" },
  yieldRow: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: "#000000",
    paddingVertical: 3,
    backgroundColor: "#f0f0f0",
    fontFamily: "Helvetica-Bold",
  },
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
// size, rounded up -- just the count, since this is a pick list (how
// many to grab), not a measurement reference.
function fmtBottleCount(oz: number, bottleSizeMl: number | null) {
  if (!(oz > 0) || !bottleSizeMl) return "—";
  const bottleSizeOz = bottleSizeMl / ML_PER_OZ;
  if (!bottleSizeOz) return "—";
  return `${Math.ceil(oz / bottleSizeOz)}`;
}

function fmtOz(oz: number) {
  return oz > 0 ? `${Math.ceil(oz)} oz` : "—";
}

// Rounds a set of oz amounts to whole numbers while keeping their sum
// exactly equal to the target -- the batch display should never imply
// more (or less) volume than the container actually holds. Standard
// largest-remainder apportionment: floor everything, then hand out the
// leftover whole ounces to whichever ingredients had the largest
// fractional part, so no single ingredient absorbs all the rounding.
function roundToWholeOzSum(lines: { productId: string; quantityOz: number }[], targetOz: number): Map<string, number> {
  const floored = lines.map((l) => ({
    productId: l.productId,
    floor: Math.floor(l.quantityOz),
    remainder: l.quantityOz - Math.floor(l.quantityOz),
  }));
  const flooredSum = floored.reduce((sum, f) => sum + f.floor, 0);
  const leftover = Math.max(0, Math.round(targetOz) - flooredSum);
  const byRemainderDesc = [...floored].sort((a, b) => b.remainder - a.remainder);
  const result = new Map(floored.map((f) => [f.productId, f.floor]));
  for (let i = 0; i < leftover && i < byRemainderDesc.length; i++) {
    const pid = byRemainderDesc[i].productId;
    result.set(pid, (result.get(pid) ?? 0) + 1);
  }
  return result;
}

export function RecipeOpsSheetDocument({
  name,
  description,
  category,
  instructions,
  batchInstructions,
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
  batchInstructions: string | null;
  originalRecipe: string | null;
  sourceUrl: string | null;
  ingredients: OpsSheetIngredientLine[];
  costSizes: RecipeSizeResult[];
  generatedAt: string;
}) {
  const literLabel = RECIPE_SIZE_DEFS.find((s) => s.key === "liter")?.label ?? "1L";
  const bubblerLabel = RECIPE_SIZE_DEFS.find((s) => s.key === "batch_2_5_gal")?.label ?? "2.5gal";
  // The pre-made batch never includes Top Off -- that's added fresh per
  // serving at pour time, not pre-mixed and stored -- so only the
  // measured ingredients are scaled to fill the full batch volume.
  const literMaxOz = RECIPE_SIZE_DEFS.find((s) => s.key === "liter")?.pourOz ?? 32;
  const bubblerMaxOz = RECIPE_SIZE_DEFS.find((s) => s.key === "batch_2_5_gal")?.pourOz ?? 320;
  const literOz = roundToWholeOzSum(resolveMeasuredIngredientsForSize(ingredients, "liter"), literMaxOz);
  const bubblerOz = roundToWholeOzSum(resolveMeasuredIngredientsForSize(ingredients, "batch_2_5_gal"), bubblerMaxOz);
  const measuredIngredients = ingredients.filter((i) => i.quantityOz != null);
  const literYield = measuredIngredients.reduce((sum, i) => sum + (literOz.get(i.productId) ?? 0), 0);
  const bubblerYield = measuredIngredients.reduce((sum, i) => sum + (bubblerOz.get(i.productId) ?? 0), 0);

  // Grouped by Product Type, in the same fixed order as the Products
  // tabs -- Top Off is excluded, same as BATCH SERVICE, since it isn't
  // part of batch production.
  const groups = PRODUCT_TYPE_OPTIONS.map((opt) => ({
    label: opt.shortLabel,
    items: measuredIngredients.filter((i) => i.productType === opt.value),
  })).filter((g) => g.items.length > 0);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{name}</Text>
            {!!category && <Text style={styles.subtitle}>{category}</Text>}
            {!!description && <Text style={styles.subtitle}>{description}</Text>}
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

        <View wrap={false}>
          <Text style={styles.sectionTitle}>COST &amp; MSRP</Text>
          <View style={styles.thRow}>
            <Text style={styles.colServing}>Serving</Text>
            <Text style={styles.colCost}>Pour</Text>
            <Text style={styles.colCost}>Cost</Text>
            <Text style={styles.colCost}>BEO</Text>
            <Text style={styles.colCost}>MSRP</Text>
          </View>
          {costSizes.map((s) => (
            <View key={s.key} style={styles.tr}>
              <Text style={styles.colServing}>{s.label}</Text>
              <Text style={styles.colCost}>{s.totalOz} oz</Text>
              <Text style={styles.colCost}>{fmtCurrency(s.cost)}</Text>
              <Text style={[styles.colCost, styles.beoText]}>{fmtRounded(s.beo)}</Text>
              <Text style={[styles.colCost, styles.msrpText]}>{fmtRounded(s.msrp)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>BATCH PICK LIST</Text>
        <View style={styles.thRow}>
          <Text style={styles.colProduct}>Ingredient</Text>
          <Text style={styles.colBatch}>{literLabel} Batch</Text>
          <Text style={styles.colBatch}>{bubblerLabel} Batch</Text>
        </View>
        {groups.map((group) => (
          <View key={group.label} wrap={false}>
            <View style={styles.groupRow}>
              <Text style={styles.groupLabel}>{group.label}</Text>
            </View>
            {group.items.map((ing) => (
              <View key={ing.productId} style={styles.tr}>
                <View style={styles.colProduct}>
                  <View style={styles.checkbox} />
                  <Text>{ing.description}</Text>
                </View>
                <Text style={styles.colBatch}>{fmtBottleCount(literOz.get(ing.productId) ?? 0, ing.bottleSizeMl)}</Text>
                <Text style={styles.colBatch}>{fmtBottleCount(bubblerOz.get(ing.productId) ?? 0, ing.bottleSizeMl)}</Text>
              </View>
            ))}
          </View>
        ))}
        {!ingredients.length && <Text style={styles.instructionsText}>No ingredients on file.</Text>}

        {!!measuredIngredients.length && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>BATCH SERVICE</Text>
            <View style={styles.thRow}>
              <Text style={styles.colProduct}>Ingredient</Text>
              <Text style={styles.colBatch}>{literLabel} Batch</Text>
              <Text style={styles.colBatch}>{bubblerLabel} Batch</Text>
            </View>
            {measuredIngredients.map((ing) => (
              <View key={ing.productId} style={styles.tr}>
                <Text style={[styles.colProduct, { paddingLeft: 4 }]}>{ing.description}</Text>
                <Text style={styles.colBatch}>{fmtOz(literOz.get(ing.productId) ?? 0)}</Text>
                <Text style={styles.colBatch}>{fmtOz(bubblerOz.get(ing.productId) ?? 0)}</Text>
              </View>
            ))}
            <View style={styles.yieldRow}>
              <Text style={[styles.colProduct, { paddingLeft: 4 }]}>TOT Yield</Text>
              <Text style={styles.colBatch}>
                {fmtOz(literYield)} / {literMaxOz} oz
              </Text>
              <Text style={styles.colBatch}>
                {fmtOz(bubblerYield)} / {bubblerMaxOz} oz
              </Text>
            </View>
          </View>
        )}

        <View wrap={false}>
          <Text style={styles.sectionTitle}>BATCH INSTRUCTIONS</Text>
          <Text style={styles.instructionsText}>{batchInstructions || "No batch instructions on file."}</Text>
        </View>
      </Page>
    </Document>
  );
}
