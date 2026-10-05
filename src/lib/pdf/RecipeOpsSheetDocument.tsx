import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { RECIPE_SIZE_DEFS, resolveIngredientsForSize, type RecipeIngredientLine, type RecipeSizeKey } from "@/lib/recipeCost";

// The pick list is about batch production quantities, not the serving
// cup/container -- "Batch" reads clearer here than the cup names
// ("Carafe"/"Bubbler") used elsewhere (Cost & MSRP, Recipes list).
const PICK_LIST_LABEL_OVERRIDES: Partial<Record<RecipeSizeKey, string>> = {
  liter: "1L Batch",
  batch_2_5_gal: "2.5gal Batch",
};

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
  ingredients: RecipeIngredientLine[];
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
            <Text style={styles.sectionTitle}>How to Make It</Text>
            <Text style={styles.instructionsText}>{instructions || "No instructions on file."}</Text>
          </View>
          <View style={styles.howToColRight}>
            <Text style={styles.sectionTitle}>Original Recipe</Text>
            <Text style={styles.instructionsText}>{originalRecipe || "No original recipe on file."}</Text>
            {sourceUrl && <Text style={styles.sourceUrl}>Source: {sourceUrl}</Text>}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Ingredients / Pick List</Text>
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
              return (
                <Text key={s.key} style={styles.colSize}>
                  {resolved ? fmtOz(resolved.quantityOz) : "—"}
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
