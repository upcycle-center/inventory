"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { CountType } from "@/lib/supabase/types";

export interface CountLineInput {
  product_id: string;
  qty_each: number | null;
  qty_cases: number | null;
}

export async function submitCount(
  eventId: string,
  locationId: string,
  type: CountType,
  lines: CountLineInput[]
): Promise<{ error: string } | void> {
  const profile = await requireProfile();
  const supabase = createClient();

  const nonEmptyLines = lines.filter((l) => l.qty_each !== null || l.qty_cases !== null);
  if (nonEmptyLines.length === 0) {
    return { error: "Enter at least one quantity before submitting." };
  }

  const { data: count, error: countError } = await supabase
    .from("location_counts")
    .insert({
      event_id: eventId,
      location_id: locationId,
      user_id: profile.id,
      type,
    })
    .select("id")
    .single();

  if (countError || !count) {
    return { error: countError?.message ?? "Could not start the count." };
  }

  const { error: linesError } = await supabase.from("location_count_lines").insert(
    nonEmptyLines.map((l) => ({
      location_count_id: count.id,
      product_id: l.product_id,
      qty_each: l.qty_each,
      qty_cases: l.qty_cases,
    }))
  );

  if (linesError) {
    return { error: linesError.message };
  }

  redirect(`/count?event=${eventId}&location=${locationId}`);
}
