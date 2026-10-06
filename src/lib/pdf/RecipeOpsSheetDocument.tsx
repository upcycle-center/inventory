import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { ML_PER_OZ, RECIPE_SIZE_DEFS, resolveMeasuredIngredientsForSize, type RecipeIngredientLine } from "@/lib/recipeCost";
import { PRODUCT_TYPE_OPTIONS } from "@/lib/productType";

export interface OpsSheetIngredientLine extends RecipeIngredientLine {
  bottleSizeMl: number | null;
  productType: string;
}

// Which RECIPE_SIZE_DEFS keys are pre-made batches (BATCH PICK
// LIST/SERVICE columns) rather than a single Serving pour.
const BATCH_SIZE_KEYS = new Set(["liter", "batch_3_gal"]);

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  title: { fontSize: 18, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 11, color: "#555555" },
  headerRight: { alignItems: "flex-end" },
  headerPhoto: { width: 64, height: 64, borderRadius: 4, marginBottom: 4, objectFit: "cover" },
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
  topOffText: { color: "#6b7280", fontStyle: "italic" },
});

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
  photoUrl,
  instructions,
  batchInstructions,
  originalRecipe,
  sourceUrl,
  ingredients,
  generatedAt,
}: {
  name: string;
  description: string | null;
  category: string | null;
  photoUrl: string | null;
  instructions: string | null;
  batchInstructions: string | null;
  originalRecipe: string | null;
  sourceUrl: string | null;
  ingredients: OpsSheetIngredientLine[];
  generatedAt: string;
}) {
  // The pre-made batch never includes Top Off -- that's added fresh per
  // serving at pour time, not pre-mixed and stored -- so only the
  // measured ingredients are scaled to fill the full batch volume.
  // Every batch-production size (1L through the largest Bubbler) gets
  // its own pick-list/service column, driven generically off
  // RECIPE_SIZE_DEFS so a new size needs no further changes here.
  const batchSizes = RECIPE_SIZE_DEFS.filter((s) => BATCH_SIZE_KEYS.has(s.key)).map((s) => {
    const oz = roundToWholeOzSum(resolveMeasuredIngredientsForSize(ingredients, s.key), s.pourOz);
    return { key: s.key, label: s.label, maxOz: s.pourOz, oz };
  });
  const measuredIngredients = ingredients.filter((i) => i.quantityOz != null);
  const batchYields = new Map(
    batchSizes.map((b) => [b.key, measuredIngredients.reduce((sum, i) => sum + (b.oz.get(i.productId) ?? 0), 0)])
  );

  // All ingredients -- including Top Off (e.g. a Mixer) -- grouped by
  // Product Type, in the same fixed order as the Products tabs. BATCH
  // PICK LIST needs Top Off items too, so staff know to pull them for
  // use at pour time, even though they have no fixed batch quantity.
  const pickListGroups = PRODUCT_TYPE_OPTIONS.map((opt) => ({
    label: opt.shortLabel,
    items: ingredients.filter((i) => i.productType === opt.value).sort((a, b) => a.description.localeCompare(b.description)),
  })).filter((g) => g.items.length > 0);
  // Same grouping, measured ingredients only -- Top Off is excluded
  // here since BATCH SERVICE states exact pre-batched amounts, and Top
  // Off is added fresh per serving, not pre-mixed and stored.
  const measuredIngredientsGrouped = PRODUCT_TYPE_OPTIONS.flatMap((opt) =>
    measuredIngredients.filter((i) => i.productType === opt.value).sort((a, b) => a.description.localeCompare(b.description))
  );

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{name}</Text>
            {!!category && <Text style={styles.subtitle}>{category}</Text>}
            {!!description && <Text style={styles.subtitle}>{description}</Text>}
          </View>
          <View style={styles.headerRight}>
            {!!photoUrl && <Image src={photoUrl} style={styles.headerPhoto} />}
            <Text style={styles.printedAt}>Printed {generatedAt}</Text>
          </View>
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
          {batchSizes.map((b) => (
            <Text key={b.key} style={styles.colBatch}>
              {b.label} Batch
            </Text>
          ))}
        </View>
        {pickListGroups.map((group) => (
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
                {ing.quantityOz == null
                  ? batchSizes.map((b) => (
                      <Text key={b.key} style={[styles.colBatch, styles.topOffText]}>
                        Top Off
                      </Text>
                    ))
                  : batchSizes.map((b) => (
                      <Text key={b.key} style={styles.colBatch}>
                        {fmtBottleCount(b.oz.get(ing.productId) ?? 0, ing.bottleSizeMl)}
                      </Text>
                    ))}
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
              {batchSizes.map((b) => (
                <Text key={b.key} style={styles.colBatch}>
                  {b.label} Batch
                </Text>
              ))}
            </View>
            {measuredIngredientsGrouped.map((ing) => (
              <View key={ing.productId} style={styles.tr}>
                <Text style={[styles.colProduct, { paddingLeft: 4 }]}>{ing.description}</Text>
                {batchSizes.map((b) => (
                  <Text key={b.key} style={styles.colBatch}>
                    {fmtOz(b.oz.get(ing.productId) ?? 0)}
                  </Text>
                ))}
              </View>
            ))}
            <View style={styles.yieldRow}>
              <Text style={[styles.colProduct, { paddingLeft: 4 }]}>TOT Yield</Text>
              {batchSizes.map((b) => (
                <Text key={b.key} style={styles.colBatch}>
                  {fmtOz(batchYields.get(b.key) ?? 0)} / {b.maxOz} oz
                </Text>
              ))}
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
