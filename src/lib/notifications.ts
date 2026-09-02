import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./supabase/types";

export const NOTIFICATION_CATEGORIES = [
  { value: "receiving", label: "Receiving" },
  { value: "requests", label: "Requests" },
  { value: "transfers", label: "Transfers" },
  { value: "counts", label: "Counts" },
  { value: "dashboard", label: "Dashboard" },
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]["value"];

// Every opted-in user's notification email for a given report category
// (a user subscribed to "all" gets every category). No fallback to the
// Auth email: that column is login-technical now and, for a user
// without a real company email, may not be deliverable at all.
export async function getSystemNotificationRecipients(
  supabase: SupabaseClient,
  category: NotificationCategory
): Promise<string[]> {
  const { data } = await supabase.from("profiles").select("*").overlaps("notification_categories", [category, "all"]);
  return ((data as Profile[] | null) ?? []).map((p) => p.notification_email).filter((e): e is string => !!e);
}
