import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Recipe, RecipeServingPackagingCost } from "@/lib/supabase/types";
import { computeRecipeSizes, costPerOz, RECIPE_SIZE_DEFS, type RecipeSizeKey } from "@/lib/recipeCost";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DownloadIcon } from "@/components/DownloadIcon";
import { ProductThumbnail } from "@/components/ProductThumbnail";
import { ActionForm } from "@/components/ActionForm";
import { updatePackagingCosts } from "./actions";

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
  const [{ data: recipesRaw }, { data: ingredientsRaw }, { data: packagingCostsRaw }] = await Promise.all([
    supabase.from("recipes").select("*").order("name"),
    supabase
      .from("recipe_ingredients")
      .select("recipe_id, quantity_oz, product:products(id, description, case_cost, case_size, bottle_size_ml)"),
    supabase.from("recipe_serving_packaging_costs").select("*"),
  ]);

  const recipes = (recipesRaw as Recipe[] | null) ?? [];
  const packagingCosts: Partial<Record<RecipeSizeKey, number>> = {};
  for (const row of (packagingCostsRaw as RecipeServingPackagingCost[] | null) ?? []) {
    packagingCosts[row.size] = Number(row.cost);
  }

  const ingredientsByRecipeId = new Map<string, { productId: string; description: string; quantityOz: number | null; costPerOz: number | null }[]>();
  for (const row of (ingredientsRaw as any[]) ?? []) {
    if (!row.product) continue;
    const list = ingredientsByRecipeId.get(row.recipe_id) ?? [];
    list.push({
      productId: row.product.id,
      description: row.product.description,
      quantityOz: row.quantity_oz == null ? null : Number(row.quantity_oz),
      costPerOz: costPerOz(row.product),
    });
    ingredientsByRecipeId.set(row.recipe_id, list);
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Recipes" }]} />
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Recipes</h1>
        <Link href="/admin/recipes/new" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Add Recipe
        </Link>
      </div>

      <ActionForm action={updatePackagingCosts} savedLabel="Saved" className="mb-4 flex items-end gap-3">
        <label className="text-sm text-gray-600">
          Packaging cost (cup + ice), per serving
          <br />
          <span className="flex items-center gap-1">
            $
            <input
              name="cost"
              type="number"
              min={0}
              step={0.01}
              defaultValue={packagingCosts[RECIPE_SIZE_DEFS[0].key] ?? 0.5}
              className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </span>
        </label>
        <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-xs text-white">
          Save
        </button>
      </ActionForm>

      <table className="w-full text-left text-sm">
        <thead className="text-gray-500">
          <tr>
            <th className="px-3 pb-2"></th>
            <th className="px-3 pb-2 whitespace-nowrap">Recipe</th>
            {RECIPE_SIZE_DEFS.map((s) => {
              const [amount, ...rest] = s.label.split(" ");
              return (
                <th key={s.key} className="whitespace-nowrap px-3 pb-2 text-center">
                  <div>{amount}</div>
                  <div>{rest.join(" ")}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {recipes.map((r) => {
            const ingredients = ingredientsByRecipeId.get(r.id) ?? [];
            const sizes = computeRecipeSizes(ingredients, r.target_pour_cost_pct, packagingCosts);
            const byKey = Object.fromEntries(sizes.map((s) => [s.key, s]));
            return (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-3 py-2">
                  <ProductThumbnail photoUrl={r.photo_url} alt={r.name} />
                </td>
                <td className="px-3 py-2">
                  <div className="whitespace-nowrap">
                    <a
                      href={`/api/recipes/${r.id}/ops-sheet`}
                      title="Download Ops Sheet"
                      aria-label="Download Ops Sheet"
                      className="mr-2 inline-flex items-center text-gray-400 hover:text-brand"
                    >
                      <DownloadIcon />
                    </a>
                    <Link href={`/admin/recipes/${r.id}`} className="text-brand hover:underline">
                      {r.name}
                    </Link>
                    {!r.active && <span className="ml-2 text-xs text-gray-400">Inactive</span>}
                  </div>
                  {r.description && <div className="whitespace-nowrap text-gray-400">{r.description}</div>}
                </td>
                {RECIPE_SIZE_DEFS.map((s) => (
                  <td key={s.key} className="px-3 py-2">
                    <CostCell cost={byKey[s.key]?.cost ?? null} msrp={byKey[s.key]?.msrp ?? null} />
                  </td>
                ))}
              </tr>
            );
          })}
          {!recipes.length && (
            <tr>
              <td colSpan={RECIPE_SIZE_DEFS.length + 2} className="px-3 py-6 text-center text-gray-400">
                No recipes yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
