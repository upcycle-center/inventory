import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Recipe } from "@/lib/supabase/types";
import { computeRecipeSizes, costPerOz } from "@/lib/recipeCost";
import { createRecipe } from "./actions";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

function fmtCurrency(value: number | null) {
  return value == null ? "—" : `$${value.toFixed(2)}`;
}

export default async function AdminRecipesPage() {
  const supabase = createClient();
  const [{ data: recipesRaw }, { data: ingredientsRaw }] = await Promise.all([
    supabase.from("recipes").select("*").order("name"),
    supabase
      .from("recipe_ingredients")
      .select("recipe_id, quantity_oz, product:products(id, description, case_cost, case_size, bottle_size_ml)"),
  ]);

  const recipes = (recipesRaw as Recipe[] | null) ?? [];

  const ingredientsByRecipeId = new Map<string, { productId: string; description: string; quantityOz: number; costPerOz: number | null }[]>();
  for (const row of (ingredientsRaw as any[]) ?? []) {
    if (!row.product) continue;
    const list = ingredientsByRecipeId.get(row.recipe_id) ?? [];
    list.push({
      productId: row.product.id,
      description: row.product.description,
      quantityOz: Number(row.quantity_oz),
      costPerOz: costPerOz(row.product),
    });
    ingredientsByRecipeId.set(row.recipe_id, list);
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Recipes" }]} />
      <h1 className="mb-2 text-lg font-semibold">Recipes</h1>
      <p className="mb-6 text-sm text-gray-500">
        Cost a drink recipe at Single Serving, Double Serving, 1L Batch, and 2.5gal Batch, with a
        recommended MSRP at a 20% pour cost (the standard target for a NY concert-venue bar
        program).
      </p>

      <ActionForm
        action={createRecipe}
        savedLabel="Recipe added"
        resetOnSuccess
        className="mb-8 grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <p className="text-sm font-medium">Add a recipe</p>
        <input name="name" placeholder="Name (e.g. House Margarita)" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input name="description" placeholder="Description (optional)" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="w-fit rounded-md bg-brand px-4 py-2 text-sm text-white">
          Add recipe
        </button>
      </ActionForm>

      <table className="w-full text-left text-sm">
        <thead className="text-gray-500">
          <tr>
            <th className="px-3 pb-2">Name</th>
            <th className="px-3 pb-2">Ingredients</th>
            <th className="px-3 pb-2">Single Serving Cost</th>
            <th className="px-3 pb-2">Single Serving MSRP</th>
          </tr>
        </thead>
        <tbody>
          {recipes.map((r) => {
            const ingredients = ingredientsByRecipeId.get(r.id) ?? [];
            const single = computeRecipeSizes(ingredients).find((s) => s.key === "single");
            return (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-3 py-2">
                  <Link href={`/admin/recipes/${r.id}`} className="text-brand hover:underline">
                    {r.name}
                  </Link>
                  {!r.active && <span className="ml-2 text-xs text-gray-400">Inactive</span>}
                  {r.description && <span className="ml-2 text-gray-400">{r.description}</span>}
                </td>
                <td className="px-3 py-2 text-gray-500">
                  {ingredients.length} ingredient{ingredients.length === 1 ? "" : "s"}
                </td>
                <td className="px-3 py-2 text-gray-500">{fmtCurrency(single?.cost ?? null)}</td>
                <td className="px-3 py-2 text-gray-500">{fmtCurrency(single?.msrp ?? null)}</td>
              </tr>
            );
          })}
          {!recipes.length && (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                No recipes yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
