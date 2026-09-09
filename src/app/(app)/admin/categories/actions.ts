"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function createCategory(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  const glCode = String(formData.get("gl_code") || "").trim() || null;

  await supabase.from("product_categories").insert({ name, gl_code: glCode });
  revalidatePath("/admin/categories");
}

export async function updateCategory(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return;

  const glCode = String(formData.get("gl_code") || "").trim() || null;

  await supabase.from("product_categories").update({ name, gl_code: glCode }).eq("id", id);
  revalidatePath("/admin/categories");
  revalidatePath(`/admin/categories/${id}`);
}

export async function deleteCategory(id: string): Promise<{ error: string } | void> {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("product_categories").delete().eq("id", id);

  if (error) {
    const message = error.message.toLowerCase().includes("foreign key")
      ? "Can't delete — products are assigned to this category. Reassign them first."
      : error.message;
    return { error: message };
  }

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}
