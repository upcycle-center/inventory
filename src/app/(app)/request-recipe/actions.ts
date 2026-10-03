"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { RecipeRequestSize } from "@/lib/supabase/types";

const SIZE_VALUES: RecipeRequestSize[] = ["single", "double", "liter", "batch_2_5_gal"];

export async function submitRecipeRequest(formData: FormData): Promise<{ error: string } | void> {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  const supabase = createClient();

  const locationId = String(formData.get("location_id") || "");
  const recipeId = String(formData.get("recipe_id") || "");
  const size = String(formData.get("size") || "") as RecipeRequestSize;
  const quantity = Number(formData.get("quantity") || 0);
  const note = String(formData.get("note") || "").trim() || null;

  if (!locationId || !recipeId) return { error: "Select a location and a recipe." };
  if (!SIZE_VALUES.includes(size)) return { error: "Select a size." };
  if (!quantity || quantity <= 0) return { error: "Enter a quantity greater than 0." };

  const { error } = await supabase.from("recipe_requests").insert({
    location_id: locationId,
    recipe_id: recipeId,
    size,
    quantity,
    note,
    requested_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/request-recipe");
  revalidatePath("/restock-requests");
}
