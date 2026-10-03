import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { RECIPE_SIZE_DEFS, scaleForSize } from "@/lib/recipeCost";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 11, marginBottom: 14, color: "#555555" },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
    backgroundColor: "#f0f0f0",
    padding: 4,
  },
  instructionsText: { fontSize: 10, lineHeight: 1.5 },
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

interface IngredientLine {
  description: string;
  quantityOz: number;
}

function fmtOz(oz: number) {
  return oz > 0 ? `${oz.toFixed(2)} oz` : "—";
}

export function RecipeOpsSheetDocument({
  name,
  description,
  instructions,
  ingredients,
  generatedAt,
}: {
  name: string;
  description: string | null;
  instructions: string | null;
  ingredients: IngredientLine[];
  generatedAt: string;
}) {
  const baseTotalOz = ingredients.reduce((sum, i) => sum + i.quantityOz, 0);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.subtitle}>
          {description ? `${description} · ` : ""}
          Printed {generatedAt}
        </Text>

        <Text style={styles.sectionTitle}>How to Make It</Text>
        <Text style={styles.instructionsText}>{instructions || "No instructions on file."}</Text>

        <Text style={styles.sectionTitle}>Ingredients / Pick List</Text>
        <View style={styles.thRow}>
          <Text style={styles.colProduct}>Ingredient</Text>
          {RECIPE_SIZE_DEFS.map((s) => (
            <Text key={s.key} style={styles.colSize}>
              {s.label}
            </Text>
          ))}
        </View>
        {ingredients.map((ing) => (
          <View key={ing.description} style={styles.tr}>
            <Text style={styles.colProduct}>{ing.description}</Text>
            {RECIPE_SIZE_DEFS.map((s) => (
              <Text key={s.key} style={styles.colSize}>
                {fmtOz(ing.quantityOz * scaleForSize(s.key, baseTotalOz))}
              </Text>
            ))}
          </View>
        ))}
        {!ingredients.length && <Text style={styles.instructionsText}>No ingredients on file.</Text>}
      </Page>
    </Document>
  );
}
