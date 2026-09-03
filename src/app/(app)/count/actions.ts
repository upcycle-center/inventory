"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
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
  lines: CountLineInput[],
  notes?: string
): Promise<{ error: string } | void> {
  const profile = await requireProfile();
  const supabase = createClient();

  const nonEmptyLines = lines.filter((l) => l.qty_each !== null || l.qty_cases !== null);
  if (nonEmptyLines.length === 0) {
    return { error: "Enter at least one quantity before submitting." };
  }

  const { data: thisEvent } = await supabase.from("events").select("event_date").eq("id", eventId).single();
  if (thisEvent) {
    const { data: earlierOpenEvents } = await supabase
      .from("events")
      .select("id")
      .eq("status", "open")
      .lt("event_date", thisEvent.event_date)
      .neq("id", eventId)
      .limit(1);
    if (earlierOpenEvents?.length) {
      return { error: "An earlier event is still open. Events must be completed in date order." };
    }
  }

  const { data: count, error: countError } = await supabase
    .from("location_counts")
    .insert({
      event_id: eventId,
      location_id: locationId,
      user_id: profile.id,
      type,
      notes: notes?.trim() || null,
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

  if (type === "closing") {
    await maybeCloseEvent(eventId);
  }

  redirect(`/count?event=${eventId}&location=${locationId}`);
}

// Once every open+confirmed location for the event has a closing count on
// file, the event is done — flip it to closed automatically instead of
// waiting on an admin. Uses the service role since events writes are
// admin-only by RLS, but this runs for whichever stand lead happens to
// submit the last one.
async function maybeCloseEvent(eventId: string) {
  const supabase = createClient();

  const { data: readyLocations } = await supabase
    .from("event_locations")
    .select("location_id")
    .eq("event_id", eventId)
    .eq("is_open", true)
    .eq("confirmed", true);
  const readyLocationIds = ((readyLocations as { location_id: string }[] | null) ?? []).map((r) => r.location_id);
  if (!readyLocationIds.length) return;

  const { data: closingCounts } = await supabase
    .from("location_counts")
    .select("location_id")
    .eq("event_id", eventId)
    .eq("type", "closing")
    .in("location_id", readyLocationIds);
  const submittedLocationIds = new Set(
    ((closingCounts as { location_id: string }[] | null) ?? []).map((c) => c.location_id)
  );
  const allSubmitted = readyLocationIds.every((id) => submittedLocationIds.has(id));
  if (!allSubmitted) return;

  const admin = createServiceRoleClient();
  await admin.from("events").update({ status: "closed" }).eq("id", eventId).eq("status", "open");
}
