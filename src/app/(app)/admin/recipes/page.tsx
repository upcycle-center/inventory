import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Recipe } from "@/lib/supabase/types";
import { computeRecipeSizes, costPerOz } from "@/lib/recipeCost";
import { createRecipe } from "./actions";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DownloadIcon } from "@/components/DownloadIcon";

function CostCell({ cost, msrp }: { cost: number | null; msrp: number | null }) {
  if (cost == null || msrp == null) return <span className="text-gray-400">—</span>;
  return (
    <span>
      <span>${cost.toFixed(2)}</span>
      <span className="text-gray-400">/</span>
      <span className="italic text-green-700">${msrp.toFixed(2)}</span>
    </span>
  );
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
        Cost/MSRP (<span className="italic text-green-700">shown as Cost/MSRP</span>) at a 20% pour cost (NY
        concert-venue bar program standard). Open a recipe to edit ingredients, prep instructions, or download its
        Ops Sheet.
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
            <th className="px-3 pb-2">Recipe</th>
            <th className="px-3 pb-2">Single</th>
            <th className="px-3 pb-2">Double</th>
            <th className="px-3 pb-2">1L Carafe</th>
            <th className="px-3 pb-2">2.5gal Bubbler</th>
          </tr>
        </thead>
        <tbody>
          {recipes.map((r) => {
            const ingredients = ingredientsByRecipeId.get(r.id) ?? [];
            const sizes = computeRecipeSizes(ingredients);
            const byKey = Object.fromEntries(sizes.map((s) => [s.key, s]));
            return (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-3 py-2">
                  <Link href={`/admin/recipes/${r.id}`} className="text-brand hover:underline">
                    {r.name}
                  </Link>
                  {!r.active && <span className="ml-2 text-xs text-gray-400">Inactive</span>}
                  {r.description && <span className="ml-2 text-gray-400">{r.description}</span>}
                  <a
                    href={`/api/recipes/${r.id}/ops-sheet`}
                    className="ml-2 inline-flex items-center gap-1 text-xs text-brand hover:underline"
                  >
                    Ops Sheet
                    <DownloadIcon />
                  </a>
                </td>
                <td className="px-3 py-2">
                  <CostCell cost={byKey.single?.cost ?? null} msrp={byKey.single?.msrp ?? null} />
                </td>
                <td className="px-3 py-2">
                  <CostCell cost={byKey.double?.cost ?? null} msrp={byKey.double?.msrp ?? null} />
                </td>
                <td className="px-3 py-2">
                  <CostCell cost={byKey.liter?.cost ?? null} msrp={byKey.liter?.msrp ?? null} />
                </td>
                <td className="px-3 py-2">
                  <CostCell cost={byKey.batch_2_5_gal?.cost ?? null} msrp={byKey.batch_2_5_gal?.msrp ?? null} />
                </td>
              </tr>
            );
          })}
          {!recipes.length && (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                No recipes yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
