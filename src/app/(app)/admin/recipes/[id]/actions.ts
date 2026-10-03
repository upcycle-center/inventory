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
  const sourceUrl = String(formData.get("source_url") || "").trim() || null;
  const originalRecipe = String(formData.get("original_recipe") || "").trim() || null;
  const instructions = String(formData.get("instructions") || "").trim() || null;

  let photoUrl: string | undefined;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const ext = photo.name.split(".").pop() || "jpg";
    const path = `recipe-${id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("product-photos")
      .upload(path, photo, { contentType: photo.type, upsert: false });

    if (!uploadError) {
      const { data } = supabase.storage.from("product-photos").getPublicUrl(path);
      photoUrl = data.publicUrl;
    }
  }

  await supabase
    .from("recipes")
    .update({
      name,
      description,
      source_url: sourceUrl,
      original_recipe: originalRecipe,
      instructions,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    })
    .eq("id", id);
  revalidatePath(`/admin/recipes/${id}`);
  revalidatePath("/admin/recipes");
}

export async function updateTargetProfit(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const pct = Number(formData.get("target_profit_pct"));
  if (!id || !pct || pct <= 0 || pct >= 100) return;

  await supabase.from("recipes").update({ target_profit_pct: pct }).eq("id", id);
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
