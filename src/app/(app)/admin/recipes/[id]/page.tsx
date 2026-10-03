import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Product, Recipe, RecipeIngredient } from "@/lib/supabase/types";
import { computeRecipeSizes, costPerOz } from "@/lib/recipeCost";
import type { ProductTypeValue } from "@/lib/productType";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductPlaceholderIcon } from "@/components/ProductPlaceholderIcon";
import { toggleRecipeActive } from "../actions";
import { DeleteRecipeButton } from "../DeleteRecipeButton";
import { removeIngredient, updateIngredientQty, updateRecipe, updateTargetPourCost } from "./actions";
import { AddIngredientForm } from "./AddIngredientForm";

function fmtCurrency(value: number | null) {
  return value == null ? "—" : `$${value.toFixed(2)}`;
}

export default async function RecipeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: recipe }, { data: ingredientsRaw }, { data: products }] = await Promise.all([
    supabase.from("recipes").select("*").eq("id", params.id).single(),
    supabase
      .from("recipe_ingredients")
      .select("*, product:products(id, sku, description, case_cost, case_size, bottle_size_ml)")
      .eq("recipe_id", params.id)
      .order("sort_order"),
    supabase.from("products").select("id, description, product_type").eq("active", true).order("description"),
  ]);

  if (!recipe) notFound();

  const ingredientRows = (ingredientsRaw as (RecipeIngredient & { product: Product | null })[] | null) ?? [];
  const costLines = ingredientRows
    .filter((row) => row.product)
    .map((row) => ({
      productId: row.product!.id,
      description: row.product!.description,
      quantityOz: row.quantity_oz == null ? null : Number(row.quantity_oz),
      costPerOz: costPerOz(row.product!),
    }));
  const sizes = computeRecipeSizes(costLines, recipe.target_pour_cost_pct);
  const missingCostProducts = costLines.filter((l) => l.costPerOz == null).map((l) => l.description);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Recipes", href: "/admin/recipes" }, { label: recipe.name }]} />
      <h1 className="mb-6 text-lg font-semibold">Edit recipe</h1>

      <ActionForm
        id="edit-recipe-form"
        action={updateRecipe}
        encType="multipart/form-data"
        className="mb-3 grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="id" value={recipe.id} />
        <div className="mb-1 flex aspect-square w-24 items-center justify-center overflow-hidden rounded bg-gray-100">
          {recipe.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recipe.photo_url} alt={recipe.name} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ProductPlaceholderIcon />
            </div>
          )}
        </div>
        <label className="text-sm text-gray-600">
          Name
          <input name="name" defaultValue={recipe.name} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          Description
          <input
            name="description"
            defaultValue={recipe.description ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-gray-600">
          Source URL
          <input
            name="source_url"
            type="url"
            defaultValue={recipe.source_url ?? ""}
            placeholder="https://..."
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-gray-600">
          Original Recipe
          <textarea
            name="original_recipe"
            defaultValue={recipe.original_recipe ?? ""}
            rows={4}
            placeholder="Original ingredients/ratios as published, for reference..."
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-gray-600">
          Instructions (how to make it)
          <textarea
            name="instructions"
            defaultValue={recipe.instructions ?? ""}
            rows={5}
            placeholder="Build order, glassware, garnish, ice, method..."
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-gray-600">
          {recipe.photo_url ? "Replace photo" : "Add photo"}
          <input name="photo" type="file" accept="image/*" className="mt-1 block w-full text-sm" />
        </label>
      </ActionForm>

      <div className="mb-8 flex items-center gap-3">
        <button type="submit" form="edit-recipe-form" className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          Save
        </button>
        <a
          href={`/api/recipes/${recipe.id}/ops-sheet`}
          className="w-fit rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Download Ops Sheet
        </a>
        <ActionForm action={toggleRecipeActive} className="contents" savedLabel={recipe.active ? "Deactivated" : "Reactivated"}>
          <input type="hidden" name="id" value={recipe.id} />
          <input type="hidden" name="active" value={String(recipe.active)} />
          <button type="submit" className="w-fit rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
            {recipe.active ? "Deactivate" : "Reactivate"}
          </button>
        </ActionForm>
        <DeleteRecipeButton recipeId={recipe.id} />
      </div>

      <p className="mb-3 text-sm font-medium">RECIPE</p>

      <AddIngredientForm
        recipeId={recipe.id}
        products={(products as { id: string; description: string; product_type: ProductTypeValue }[] | null) ?? []}
      />

      <ul className="mb-8 space-y-1">
        {ingredientRows.map((row) =>
          row.product ? (
            <li key={row.id} className="flex items-center justify-between gap-3 rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
              <span className="flex-1">
                {row.product.description}
                {costPerOz(row.product) == null && <span className="ml-2 text-xs text-red-600">Missing cost data</span>}
              </span>
              <ActionForm action={updateIngredientQty} savedLabel="Saved" className="flex items-center gap-1">
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="recipe_id" value={recipe.id} />
                <input
                  name="quantity_oz"
                  type="number"
                  min={0.01}
                  step={0.01}
                  defaultValue={row.quantity_oz ?? ""}
                  placeholder="2 (Top Off)"
                  className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs"
                />
                <span className="text-xs text-gray-400">oz</span>
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  <input type="checkbox" name="top_off" defaultChecked={row.quantity_oz == null} className="h-3.5 w-3.5" />
                  T/O
                </label>
                <button type="submit" className="rounded-md bg-brand px-2 py-1 text-xs text-white">
                  Save
                </button>
              </ActionForm>
              <form action={removeIngredient}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="recipe_id" value={recipe.id} />
                <button type="submit" className="text-red-600 hover:underline">
                  Remove
                </button>
              </form>
            </li>
          ) : null
        )}
        {!ingredientRows.length && <li className="text-sm text-gray-400">No ingredients yet.</li>}
      </ul>

      <p className="mb-3 text-sm font-medium">COST &amp; MSRP</p>

      <ActionForm
        action={updateTargetPourCost}
        savedLabel="Saved"
        className="mb-3 flex items-center gap-2"
      >
        <input type="hidden" name="id" value={recipe.id} />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Target pour cost
          <input
            name="target_pour_cost_pct"
            type="number"
            min={1}
            max={100}
            step={0.5}
            defaultValue={recipe.target_pour_cost_pct}
            className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
          %
        </label>
        <button type="submit" className="rounded-md bg-brand px-3 py-1 text-xs text-white">
          Save
        </button>
      </ActionForm>

      {missingCostProducts.length > 0 && (
        <p className="mb-3 text-sm text-red-600">
          Cost can&apos;t be calculated — missing Case Cost/Case Size/Bottle Size on: {missingCostProducts.join(", ")}.
        </p>
      )}

      <table className="w-full max-w-2xl text-left text-sm">
        <thead className="text-gray-500">
          <tr>
            <th className="px-3 pb-2">Size</th>
            <th className="px-3 pb-2">TOT Volume</th>
            <th className="px-3 pb-2">Cost</th>
            <th className="px-3 pb-2">MSRP</th>
          </tr>
        </thead>
        <tbody>
          {sizes.map((s) => (
            <tr key={s.key} className="border-t border-gray-100">
              <td className="px-3 py-2 font-medium">{s.label}</td>
              <td className="px-3 py-2 text-gray-500">{s.totalOz.toFixed(2)} oz</td>
              <td className="px-3 py-2 text-gray-500">{fmtCurrency(s.cost)}</td>
              <td className="px-3 py-2 font-medium text-green-700">{fmtCurrency(s.msrp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
