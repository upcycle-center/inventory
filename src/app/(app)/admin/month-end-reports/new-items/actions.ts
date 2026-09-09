"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function resolveMonthEndReport(formData: FormData) {
  const profile = await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  if (!id) return;

  await supabase
    .from("month_end_new_item_reports")
    .update({ resolved_at: new Date().toISOString(), resolved_by: profile.id })
    .eq("id", id);

  revalidatePath("/admin/month-end-reports/new-items");
}
