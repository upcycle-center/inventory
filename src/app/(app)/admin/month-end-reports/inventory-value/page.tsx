import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { MonthEndValueReportView } from "@/components/MonthEndValueReportView";
import { buildMonthEndValueReport, bucketLocationGroups } from "@/lib/monthEndValue";
import { lineValue } from "@/lib/inventoryValue";
import { easternDateString } from "@/lib/easternTime";
import { MONTH_NAMES } from "@/lib/monthNames";

export default async function MonthEndInventoryValuePage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  await requireProfile(["admin"]);
  const supabase = createClient();

  const [defaultYear, defaultMonth] = easternDateString().split("-").map(Number);
  const year = Number(searchParams.year) || defaultYear;
  const month = Number(searchParams.month) || defaultMonth;

  const { locations } = await buildMonthEndValueReport(supabase, year, month, lineValue);
  const buckets = bucketLocationGroups(locations);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Month-End Reports", href: "/admin/month-end-reports" },
          { label: "TOT Inventory Value" },
        ]}
      />
      <h1 className="mb-2 text-lg font-semibold">moEND TOT Inventory Value</h1>
      <p className="mb-6 text-sm text-gray-500">
        Cost value of each location&apos;s posted month-end physical count for {MONTH_NAMES[month - 1]} {year}.
      </p>
      <MonthYearPicker basePath="/admin/month-end-reports/inventory-value" year={year} month={month} />
      <MonthEndValueReportView locations={locations} buckets={buckets} centerLabel="on hand" />
    </div>
  );
}
