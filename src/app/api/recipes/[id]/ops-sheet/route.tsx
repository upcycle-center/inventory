import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { RecipeOpsSheetDocument } from "@/lib/pdf/RecipeOpsSheetDocument";
import { exportFilename } from "@/lib/exportFilename";
import { easternDateTimeString } from "@/lib/easternTime";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient();

  const [{ data: recipe }, { data: ingredientsRaw }] = await Promise.all([
    supabase.from("recipes").select("*, category:product_categories(id, name)").eq("id", params.id).single(),
    supabase
      .from("recipe_ingredients")
      .select("quantity_oz, product:products(id, description, product_type, bottle_size_ml)")
      .eq("recipe_id", params.id)
      .order("sort_order"),
  ]);

  if (!recipe) return new Response("Not found", { status: 404 });

  const ingredients = ((ingredientsRaw as any[]) ?? [])
    .filter((row) => row.product)
    .map((row) => ({
      productId: row.product.id as string,
      description: row.product.description as string,
      quantityOz: row.quantity_oz == null ? null : Number(row.quantity_oz),
      bottleSizeMl: row.product.bottle_size_ml == null ? null : Number(row.product.bottle_size_ml),
      productType: row.product.product_type as string,
    }));

  const buffer = await renderToBuffer(
    (
      <RecipeOpsSheetDocument
        name={recipe.name}
        description={recipe.description}
        category={(recipe as any).category?.name ?? null}
        photoUrl={recipe.photo_url}
        instructions={recipe.instructions}
        batchInstructions={recipe.batch_instructions}
        ingredients={ingredients}
        generatedAt={easternDateTimeString()}
      />
    ) as any
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${exportFilename(`Recipe-${recipe.name.replace(/[^a-zA-Z0-9]+/g, "-")}-Ops-Sheet`, "pdf")}"`,
      "Cache-Control": "no-store",
    },
  });
}
