"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { VIEW_KEYS, ROLES_IN_MATRIX } from "@/lib/permissions";

export async function updateRolePermissions(formData: FormData): Promise<{ error: string } | void> {
  await requireProfile(["admin"]);
  const supabase = createClient();

  const rows = ROLES_IN_MATRIX.flatMap((role) =>
    VIEW_KEYS.map((v) => ({
      role,
      view_key: v.key,
      allowed: formData.get(`allowed_${role}_${v.key}`) === "on",
    }))
  );

  const { error } = await supabase.from("role_view_permissions").upsert(rows, { onConflict: "role,view_key" });
  if (error) return { error: error.message };

  revalidatePath("/admin/permissions");
  // Every page's top nav (and middleware's page-access check) reads this
  // table on the next request -- no separate cache to bust there.
}
