import { MONTH_NAMES } from "@/lib/monthNames";
import type { MonthEndGroupBy } from "@/lib/monthEndValue";

const GROUP_BY_OPTIONS: { value: MonthEndGroupBy; label: string }[] = [
  { value: "location", label: "Location" },
  { value: "storage_area", label: "Storage Area" },
  { value: "category", label: "Category" },
  { value: "vendor", label: "Vendor" },
  { value: "product", label: "Product" },
];

// Plain GET form -- no client JS needed. Month/Year plus every filter
// dimension a moEND value report can be sliced by, so narrowing down
// (say, just the Liquor Room's Category totals) is the same click-and-
// submit motion as picking a month, and whatever's selected here is
// exactly what a PDF/CSV export of the report reflects too.
export function MonthEndReportFilters({
  basePath,
  year,
  month,
  groupBy,
  locationId,
  categoryId,
  supplierId,
  storageAreaId,
  locations,
  categories,
  suppliers,
  storageAreas,
  yearsBack = 2,
  yearsForward = 1,
}: {
  basePath: string;
  year: number;
  month: number;
  groupBy: MonthEndGroupBy;
  locationId?: string;
  categoryId?: string;
  supplierId?: string;
  storageAreaId?: string;
  locations: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  storageAreas: { id: string; name: string }[];
  yearsBack?: number;
  yearsForward?: number;
}) {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + yearsForward; y >= currentYear - yearsBack; y--) years.push(y);

  return (
    <form action={basePath} method="get" className="mb-6 flex flex-wrap items-end gap-3">
      <label className="text-xs text-gray-500">
        Month
        <select name="month" defaultValue={month} className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm">
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-gray-500">
        Year
        <select name="year" defaultValue={year} className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm">
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-gray-500">
        Location
        <select
          name="location"
          defaultValue={locationId ?? ""}
          className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-gray-500">
        Category
        <select
          name="category"
          defaultValue={categoryId ?? ""}
          className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-gray-500">
        Vendor
        <select
          name="vendor"
          defaultValue={supplierId ?? ""}
          className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All vendors</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-gray-500">
        Storage Area
        <select
          name="storage_area"
          defaultValue={storageAreaId ?? ""}
          className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All storage areas</option>
          {storageAreas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-gray-500">
        Group by
        <select name="group_by" defaultValue={groupBy} className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm">
          {GROUP_BY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="rounded-md border border-gray-300 px-4 py-2 text-sm">
        View
      </button>
    </form>
  );
}
