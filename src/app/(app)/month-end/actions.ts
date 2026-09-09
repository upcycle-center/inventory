"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export interface MonthEndLineInput {
  product_id: string;
  qty_cases: number | null;
  qty_each: number | null;
}

export interface MonthEndNewItemInput {
  barcode: string;
  brand: string;
  product_name: string;
  case_count: number | null;
  size_each: string;
}

// Posts straight to location_product_month_end -- the same table the
// admin's one-by-one Location Details entry writes to -- so this is just
// a faster, field-friendly way to fill in a whole location's physical
// count at once instead of one product at a time. New/unlisted items get
// batched into month_end_new_item_reports for a YellowDog manager to add
// to the catalog later; they don't touch products or on-hand at all here.
export async function submitMonthEndCount(
  locationId: string,
  year: number,
  month: number,
  lines: MonthEndLineInput[],
  newItems: MonthEndNewItemInput[]
): Promise<{ error: string } | void> {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  const supabase = createClient();

  if (!locationId) return { error: "Select a location first." };
  if (!year || !month || month < 1 || month > 12) return { error: "Invalid month/year." };

  const nonEmptyLines = lines.filter((l) => l.qty_each !== null || l.qty_cases !== null);
  const validNewItems = newItems.filter((n) => n.product_name.trim());
  if (!nonEmptyLines.length && !validNewItems.length) {
    return { error: "Enter at least one quantity or new item before submitting." };
  }

  if (nonEmptyLines.length) {
    const { error } = await supabase.from("location_product_month_end").upsert(
      nonEmptyLines.map((l) => ({
        location_id: locationId,
        product_id: l.product_id,
        year,
        month,
        physical_qty_each: l.qty_each,
        physical_qty_cases: l.qty_cases,
        counted_by: profile.id,
        counted_at: new Date().toISOString(),
      })),
      { onConflict: "location_id,product_id,year,month" }
    );
    if (error) return { error: error.message };
  }

  if (validNewItems.length) {
    const { error } = await supabase.from("month_end_new_item_reports").insert(
      validNewItems.map((n) => ({
        location_id: locationId,
        year,
        month,
        barcode: n.barcode.trim() || null,
        brand: n.brand.trim() || null,
        product_name: n.product_name.trim(),
        case_count: n.case_count,
        size_each: n.size_each.trim() || null,
        reported_by: profile.id,
      }))
    );
    if (error) return { error: error.message };
  }

  revalidatePath("/month-end");
  revalidatePath(`/admin/locations/${locationId}`);
  return;
}
