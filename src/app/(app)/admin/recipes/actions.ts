"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { RECIPE_SIZE_DEFS } from "@/lib/recipeCost";

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

export async function toggleRecipeActive(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await supabase.from("recipes").update({ active: !active }).eq("id", id);
  revalidatePath("/admin/recipes");
  revalidatePath(`/admin/recipes/${id}`);
}

export async function updatePackagingCosts(formData: FormData) {
  const profile = await requireProfile(["admin"]);
  const supabase = createClient();

  for (const { key } of RECIPE_SIZE_DEFS) {
    const raw = String(formData.get(`cost_${key}`) || "").trim();
    const cost = raw ? Number(raw) : 0;
    if (Number.isNaN(cost) || cost < 0) continue;
    await supabase
      .from("recipe_serving_packaging_costs")
      .update({ cost, updated_at: new Date().toISOString(), updated_by: profile.id })
      .eq("size", key);
  }

  revalidatePath("/admin/recipes");
}

export async function deleteRecipe(id: string): Promise<{ error: string } | void> {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("recipes").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/recipes");
  redirect("/admin/recipes");
}
