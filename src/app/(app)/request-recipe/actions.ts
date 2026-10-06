"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { saveDraft, clearDraft } from "@/lib/actionDrafts";
import type { RecipeRequestSize, UserRole } from "@/lib/supabase/types";

const SIZE_VALUES: RecipeRequestSize[] = ["wine", "single", "double", "liter", "batch_3_gal"];

export interface RecipeRequestLineInput {
  recipe_id: string;
  size: RecipeRequestSize;
  quantity: number;
  note: string | null;
}

const ALLOWED_ROLES: UserRole[] = ["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"];

export async function saveRecipeRequestDraft(locationId: string, lines: RecipeRequestLineInput[]): Promise<{ error: string } | void> {
  const profile = await requireProfile(ALLOWED_ROLES);
  if (!locationId) return { error: "Select a location first." };
  const supabase = createClient();

  const res = await saveDraft(supabase, profile.id, "recipe_request", { location_id: locationId, lines });
  if (res?.error) return res;

  revalidatePath("/request-recipe");
  revalidatePath("/dashboard");
}

export async function cancelRecipeRequestDraft(): Promise<void> {
  const profile = await requireProfile(ALLOWED_ROLES);
  const supabase = createClient();

  await clearDraft(supabase, profile.id, "recipe_request");

  revalidatePath("/request-recipe");
  revalidatePath("/dashboard");
}

export async function submitRecipeRequest(locationId: string, lines: RecipeRequestLineInput[]): Promise<{ error: string } | void> {
  const profile = await requireProfile(ALLOWED_ROLES);
  const supabase = createClient();

  if (!locationId) return { error: "Select a location first." };
  if (!lines.length) return { error: "Add at least one recipe." };
  for (const line of lines) {
    if (!line.recipe_id || !SIZE_VALUES.includes(line.size) || !line.quantity || line.quantity <= 0) {
      return { error: "Each line needs a recipe, size, and quantity." };
    }
  }

  const { error } = await supabase.from("recipe_requests").insert(
    lines.map((line) => ({
      location_id: locationId,
      recipe_id: line.recipe_id,
      size: line.size,
      quantity: line.quantity,
      note: line.note,
      requested_by: profile.id,
    }))
  );

  if (error) return { error: error.message };

  await clearDraft(supabase, profile.id, "recipe_request");

  revalidatePath("/request-recipe");
  revalidatePath("/restock-requests");
  revalidatePath("/dashboard");
}
