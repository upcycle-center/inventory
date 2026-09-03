import type { SupabaseClient } from "@supabase/supabase-js";

export type ActionDraftType = "request" | "transfer" | "return";

export async function getDraft(
  supabase: SupabaseClient,
  userId: string,
  type: ActionDraftType
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from("action_drafts")
    .select("form_data")
    .eq("user_id", userId)
    .eq("type", type)
    .maybeSingle();
  return (data as { form_data: Record<string, unknown> } | null)?.form_data ?? null;
}

export async function saveDraft(
  supabase: SupabaseClient,
  userId: string,
  type: ActionDraftType,
  formData: Record<string, unknown>
): Promise<{ error: string } | void> {
  const { error } = await supabase
    .from("action_drafts")
    .upsert({ user_id: userId, type, form_data: formData, updated_at: new Date().toISOString() }, { onConflict: "user_id,type" });
  if (error) return { error: error.message };
}

export async function clearDraft(supabase: SupabaseClient, userId: string, type: ActionDraftType): Promise<void> {
  await supabase.from("action_drafts").delete().eq("user_id", userId).eq("type", type);
}

// For the Overview buttons: which draft types the current user has an
// in-progress "saved for later" draft for.
export async function getDraftTypesForUser(supabase: SupabaseClient, userId: string): Promise<Set<ActionDraftType>> {
  const { data } = await supabase.from("action_drafts").select("type").eq("user_id", userId);
  return new Set(((data as { type: ActionDraftType }[] | null) ?? []).map((d) => d.type));
}
