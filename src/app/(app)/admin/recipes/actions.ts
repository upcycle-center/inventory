"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function createRecipe(formData: FormData): Promise<{ error: string } | void> {
  const profile = await requireProfile(["admin"]);
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Name is required." };

  const description = String(formData.get("description") || "").trim() || null;

  const { data, error } = await supabase
    .from("recipes")
    .insert({ name, description, created_by: profile.id })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/recipes");
  redirect(`/admin/recipes/${data.id}`);
}

// One-click duplicate: copies the recipe's own fields plus every
// ingredient line, then lands straight on the new recipe's edit page --
// unlike Products' duplicate (a pre-filled form, needed since IC/UPC
// must be unique), a recipe has no such constraint, and ingredients
// can only be copied server-side since the New Recipe form itself has
// no ingredient editor.
export async function duplicateRecipe(formData: FormData): Promise<{ error: string } | void> {
  const profile = await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  if (!id) return { error: "Missing recipe id." };

  const [{ data: source, error: sourceError }, { data: sourceIngredients, error: ingredientsError }] = await Promise.all([
    supabase.from("recipes").select("*").eq("id", id).single(),
    supabase.from("recipe_ingredients").select("product_id, quantity_oz, sort_order").eq("recipe_id", id),
  ]);
  if (sourceError || !source) return { error: sourceError?.message ?? "Recipe not found." };
  if (ingredientsError) return { error: ingredientsError.message };

  const { data: copy, error: copyError } = await supabase
    .from("recipes")
    .insert({
      name: `${source.name} (Copy)`,
      description: source.description,
      photo_url: source.photo_url,
      category_id: source.category_id,
      source_url: source.source_url,
      original_recipe: source.original_recipe,
      instructions: source.instructions,
      batch_instructions: source.batch_instructions,
      target_markup_pct: source.target_markup_pct,
      beo_markup_pct: source.beo_markup_pct,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (copyError || !copy) return { error: copyError?.message ?? "Could not create the copy." };

  if (sourceIngredients?.length) {
    const { error: insertIngredientsError } = await supabase.from("recipe_ingredients").insert(
      sourceIngredients.map((i) => ({
        recipe_id: copy.id,
        product_id: i.product_id,
        quantity_oz: i.quantity_oz,
        sort_order: i.sort_order,
      }))
    );
    if (insertIngredientsError) return { error: insertIngredientsError.message };
  }

  revalidatePath("/admin/recipes");
  redirect(`/admin/recipes/${copy.id}`);
}

export async function toggleRecipeActive(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await supabase.from("recipes").update({ active: !active }).eq("id", id);
  revalidatePath("/admin/recipes");
  revalidatePath(`/admin/recipes/${id}`);
}

export async function deleteRecipe(id: string): Promise<{ error: string } | void> {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("recipes").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/recipes");
  redirect("/admin/recipes");
}
