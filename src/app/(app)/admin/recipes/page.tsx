import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ProductCategory, Recipe } from "@/lib/supabase/types";
import { computeRecipeSizes, costPerOz, DEFAULT_BEO_MARKUP_PCT, DEFAULT_TARGET_MARKUP_PCT, RECIPE_SIZE_DEFS } from "@/lib/recipeCost";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DownloadIcon } from "@/components/DownloadIcon";
import { ProductThumbnail } from "@/components/ProductThumbnail";

function CostCell({ cost, beo, msrp }: { cost: number | null; beo: number | null; msrp: number | null }) {
  if (cost == null || beo == null || msrp == null) return <span className="text-gray-400">—</span>;
  return (
    <span>
      <span>${cost.toFixed(2)}</span>
      <span className="text-gray-400">/</span>
      <span className="italic text-blue-700">${Math.ceil(beo)}</span>
      <span className="text-gray-400">/</span>
      <span className="italic text-green-700">${Math.ceil(msrp)}</span>
    </span>
  );
}

export default async function AdminRecipesPage() {
  const supabase = createClient();
  const [{ data: recipesRaw }, { data: ingredientsRaw }, { data: categoriesRaw }] = await Promise.all([
    supabase.from("recipes").select("*").order("name"),
    supabase
      .from("recipe_ingredients")
      .select("recipe_id, quantity_oz, product:products(id, description, case_cost, case_size, bottle_size_ml)"),
    supabase.from("product_categories").select("*"),
  ]);

  const recipes = (recipesRaw as Recipe[] | null) ?? [];
  const categoryNameById = new Map(((categoriesRaw as ProductCategory[] | null) ?? []).map((c) => [c.id, c.name]));

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
            const sizes = computeRecipeSizes(
              ingredients,
              r.target_markup_pct ?? DEFAULT_TARGET_MARKUP_PCT,
              r.beo_markup_pct ?? DEFAULT_BEO_MARKUP_PCT
            );
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
                  {r.category_id && categoryNameById.get(r.category_id) && (
                    <div className="whitespace-nowrap text-xs text-gray-400">{categoryNameById.get(r.category_id)}</div>
                  )}
                  {r.description && <div className="whitespace-nowrap text-gray-400">{r.description}</div>}
                </td>
                {RECIPE_SIZE_DEFS.map((s) => (
                  <td key={s.key} className="px-3 py-2">
                    <CostCell cost={byKey[s.key]?.cost ?? null} beo={byKey[s.key]?.beo ?? null} msrp={byKey[s.key]?.msrp ?? null} />
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
