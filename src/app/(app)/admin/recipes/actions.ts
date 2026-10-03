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
