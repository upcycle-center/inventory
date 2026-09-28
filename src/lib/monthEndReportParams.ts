import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonthEndGroupBy, MonthEndValueFilters } from "./monthEndValue";
import { easternDateString } from "./easternTime";

export interface MonthEndReportSearchParams {
  year?: string;
  month?: string;
  location?: string;
  category?: string;
  vendor?: string;
  storage_area?: string;
  group_by?: string;
}

const VALID_GROUP_BY = new Set(["location", "storage_area", "category", "vendor", "product"]);

// Shared by the TOT Inventory Value / TOT Retail Value report pages and
// their PDF/CSV export routes -- same query-string shape everywhere, so
// an export link built from a page's current searchParams reproduces
// exactly what's on screen (the PDF route then overrides group_by to
// "category" on top of this, per its own fixed layout).
export function parseMonthEndReportParams(searchParams: MonthEndReportSearchParams) {
  const [defaultYear, defaultMonth] = easternDateString().split("-").map(Number);
  const year = Number(searchParams.year) || defaultYear;
  const month = Number(searchParams.month) || defaultMonth;
  const groupBy = (VALID_GROUP_BY.has(searchParams.group_by ?? "") ? searchParams.group_by : "location") as MonthEndGroupBy;
  const filters: MonthEndValueFilters = {
    locationId: searchParams.location || undefined,
    categoryId: searchParams.category || undefined,
    supplierId: searchParams.vendor || undefined,
    storageAreaId: searchParams.storage_area || undefined,
  };
  return { year, month, groupBy, filters };
}

export async function fetchMonthEndFilterOptions(supabase: SupabaseClient) {
  const [{ data: locations }, { data: categories }, { data: suppliers }, { data: storageAreas }] = await Promise.all([
    supabase.from("locations").select("id, name").eq("active", true).order("name"),
    supabase.from("product_categories").select("id, name").order("name"),
    supabase.from("suppliers").select("id, name").order("name"),
    supabase.from("storage_areas").select("id, name").eq("active", true).order("name"),
  ]);
  return {
    locations: (locations as { id: string; name: string }[] | null) ?? [],
    categories: (categories as { id: string; name: string }[] | null) ?? [],
    suppliers: (suppliers as { id: string; name: string }[] | null) ?? [],
    storageAreas: (storageAreas as { id: string; name: string }[] | null) ?? [],
  };
}

// Builds the query string an export route needs from a report page's own
// resolved params, optionally overriding one field (e.g. PDF pins
// group_by to "category" regardless of what's on screen).
export function monthEndReportQuery(
  params: { year: number; month: number; groupBy: MonthEndGroupBy; filters: MonthEndValueFilters },
  overrides: Partial<{ groupBy: MonthEndGroupBy }> = {}
): string {
  const qs = new URLSearchParams();
  qs.set("year", String(params.year));
  qs.set("month", String(params.month));
  qs.set("group_by", overrides.groupBy ?? params.groupBy);
  if (params.filters.locationId) qs.set("location", params.filters.locationId);
  if (params.filters.categoryId) qs.set("category", params.filters.categoryId);
  if (params.filters.supplierId) qs.set("vendor", params.filters.supplierId);
  if (params.filters.storageAreaId) qs.set("storage_area", params.filters.storageAreaId);
  return qs.toString();
}
