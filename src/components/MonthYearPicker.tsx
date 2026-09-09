import { MONTH_NAMES } from "@/lib/monthNames";

// Plain GET form -- no client JS needed, works as a normal link/nav
// action. Shared by every moEND report page (each just varies basePath).
export function MonthYearPicker({
  basePath,
  year,
  month,
  yearsBack = 2,
  yearsForward = 1,
}: {
  basePath: string;
  year: number;
  month: number;
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
      <button type="submit" className="rounded-md border border-gray-300 px-4 py-2 text-sm">
        View
      </button>
    </form>
  );
}
