import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { ML_PER_OZ, RECIPE_SIZE_DEFS, resolveIngredientsForSize, type RecipeIngredientLine, type RecipeSizeKey } from "@/lib/recipeCost";

// The pick list is about batch production quantities, not the serving
// cup/container -- "Batch" reads clearer here than the cup names
// ("Carafe"/"Bubbler") used elsewhere (Cost & MSRP, Recipes list).
const PICK_LIST_LABEL_OVERRIDES: Partial<Record<RecipeSizeKey, string>> = {
  liter: "1L Batch",
  batch_2_5_gal: "2.5gal Batch",
};

// For these two batch sizes, the pick list shows whole units (EA) to
// pull/open -- how many bottles/cans -- instead of fluid oz, since
// that's what Batch Service is actually grabbing off the shelf.
const EACH_UNIT_SIZE_KEYS: RecipeSizeKey[] = ["liter", "batch_2_5_gal"];

export interface OpsSheetIngredientLine extends RecipeIngredientLine {
  bottleSizeMl: number | null;
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
  tr: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000000",
    paddingVertical: 5,
  },
  colProduct: { flex: 2, paddingLeft: 4 },
  colSize: { flex: 1, textAlign: "center", borderLeftWidth: 1, borderLeftColor: "#000000" },
});

function fmtOz(oz: number) {
  return oz > 0 ? `${oz.toFixed(2)} oz` : "—";
}

// Whole units (bottles/cans) needed to cover the resolved oz for a
// batch size, rounded up -- you can't pull a fraction of a bottle.
function fmtEach(oz: number, bottleSizeMl: number | null) {
  if (!(oz > 0) || !bottleSizeMl) return "—";
  const bottleSizeOz = bottleSizeMl / ML_PER_OZ;
  if (!bottleSizeOz) return "—";
  return `${Math.ceil(oz / bottleSizeOz)} EA`;
}

export function RecipeOpsSheetDocument({
  name,
  description,
  category,
  instructions,
  originalRecipe,
  sourceUrl,
  ingredients,
  generatedAt,
}: {
  name: string;
  description: string | null;
  category: string | null;
  instructions: string | null;
  originalRecipe: string | null;
  sourceUrl: string | null;
  ingredients: OpsSheetIngredientLine[];
  generatedAt: string;
}) {
  const resolvedBySize = Object.fromEntries(RECIPE_SIZE_DEFS.map((s) => [s.key, resolveIngredientsForSize(ingredients, s.key)]));
  const subtitle = [description, category].filter(Boolean).join(" · ");

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

        <Text style={styles.sectionTitle}>BATCH SERVICE</Text>
        <View style={styles.thRow}>
          <Text style={styles.colProduct}>Ingredient</Text>
          {RECIPE_SIZE_DEFS.map((s) => (
            <Text key={s.key} style={styles.colSize}>
              {PICK_LIST_LABEL_OVERRIDES[s.key] ?? s.label}
            </Text>
          ))}
        </View>
        {ingredients.map((ing) => (
          <View key={ing.productId} style={styles.tr}>
            <Text style={styles.colProduct}>
              {ing.description}
              {ing.quantityOz == null ? " (Top Off)" : ""}
            </Text>
            {RECIPE_SIZE_DEFS.map((s) => {
              const resolved = resolvedBySize[s.key].find((l: any) => l.productId === ing.productId);
              const oz = resolved ? resolved.quantityOz : 0;
              const isEachUnit = EACH_UNIT_SIZE_KEYS.includes(s.key);
              return (
                <Text key={s.key} style={styles.colSize}>
                  {isEachUnit ? fmtEach(oz, ing.bottleSizeMl) : resolved ? fmtOz(oz) : "—"}
                </Text>
              );
            })}
          </View>
        ))}
        {!ingredients.length && <Text style={styles.instructionsText}>No ingredients on file.</Text>}
      </Page>
    </Document>
  );
}
