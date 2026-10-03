"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function updateRecipe(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return;

  const description = String(formData.get("description") || "").trim() || null;
  const instructions = String(formData.get("instructions") || "").trim() || null;

  await supabase.from("recipes").update({ name, description, instructions }).eq("id", id);
  revalidatePath(`/admin/recipes/${id}`);
  revalidatePath("/admin/recipes");
}

export async function addIngredient(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const recipeId = String(formData.get("recipe_id"));
  const productId = String(formData.get("product_id"));
  const isTopOff = formData.get("top_off") === "on";
  const quantityRaw = String(formData.get("quantity_oz") || "").trim();
  const quantityOz = quantityRaw ? Number(quantityRaw) : null;
  if (!recipeId || !productId) return;
  if (!isTopOff && (!quantityOz || quantityOz <= 0)) return;

  const { count } = await supabase
    .from("recipe_ingredients")
    .select("id", { count: "exact", head: true })
    .eq("recipe_id", recipeId);

  await supabase.from("recipe_ingredients").insert({
    recipe_id: recipeId,
    product_id: productId,
    quantity_oz: isTopOff ? null : quantityOz,
    sort_order: count ?? 0,
  });

  revalidatePath(`/admin/recipes/${recipeId}`);
  revalidatePath("/admin/recipes");
}

export async function updateIngredientQty(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const recipeId = String(formData.get("recipe_id"));
  const isTopOff = formData.get("top_off") === "on";
  const quantityRaw = String(formData.get("quantity_oz") || "").trim();
  const quantityOz = quantityRaw ? Number(quantityRaw) : null;
  if (!id || !recipeId) return;
  if (!isTopOff && (!quantityOz || quantityOz <= 0)) return;

  await supabase.from("recipe_ingredients").update({ quantity_oz: isTopOff ? null : quantityOz }).eq("id", id);
  revalidatePath(`/admin/recipes/${recipeId}`);
  revalidatePath("/admin/recipes");
}

export async function removeIngredient(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const recipeId = String(formData.get("recipe_id"));
  await supabase.from("recipe_ingredients").delete().eq("id", id);
  revalidatePath(`/admin/recipes/${recipeId}`);
  revalidatePath("/admin/recipes");
}
