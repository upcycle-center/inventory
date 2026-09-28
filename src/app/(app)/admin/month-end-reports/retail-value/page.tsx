import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MonthEndReportFilters } from "@/components/MonthEndReportFilters";
import { MonthEndValueReportView } from "@/components/MonthEndValueReportView";
import { buildMonthEndValueLines, filterMonthEndValueLines, groupMonthEndValueLines } from "@/lib/monthEndValue";
import { parseMonthEndReportParams, fetchMonthEndFilterOptions, monthEndReportQuery, type MonthEndReportSearchParams } from "@/lib/monthEndReportParams";
import { lineRetailValue } from "@/lib/inventoryValue";
import { MONTH_NAMES } from "@/lib/monthNames";

export default async function MonthEndRetailValuePage({ searchParams }: { searchParams: MonthEndReportSearchParams }) {
  await requireProfile(["admin"]);
  const supabase = createClient();

  const params = parseMonthEndReportParams(searchParams);
  const [allLines, filterOptions] = await Promise.all([
    buildMonthEndValueLines(supabase, params.year, params.month, lineRetailValue),
    fetchMonthEndFilterOptions(supabase),
  ]);
  const lines = filterMonthEndValueLines(allLines, params.filters);
  const { groups, grandTotal } = groupMonthEndValueLines(lines, params.groupBy);

  const csvQuery = monthEndReportQuery(params);
  const pdfQuery = monthEndReportQuery(params, { groupBy: "category" });

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Month-End Reports", href: "/admin/month-end-reports" },
          { label: "TOT Retail Value" },
        ]}
      />
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold">moEND TOT Retail Value</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href={`/api/month-end-reports/retail-value/export?${csvQuery}`} className="text-brand hover:underline">
            Export CSV
          </Link>
          <Link href={`/api/month-end-reports/retail-value/pdf?${pdfQuery}`} className="text-brand hover:underline">
            Download PDF
          </Link>
        </div>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Projected retail value of each location&apos;s posted month-end physical count for {MONTH_NAMES[params.month - 1]} {params.year}.
        Chargeable items use Retail Value; Non-Chargeable – Bottles project pours-per-bottle x price/pour, less the
        site-wide waste allowance; Non-Chargeable – Mixers and Disposables/Cleaning carry no retail value. Use the
        filters below for dynamic, on-screen slicing — CSV export reflects the same filters, while the PDF is always
        organized by Category for a consistent printed layout.
      </p>
      <MonthEndReportFilters
        basePath="/admin/month-end-reports/retail-value"
        year={params.year}
        month={params.month}
        groupBy={params.groupBy}
        locationId={params.filters.locationId}
        categoryId={params.filters.categoryId}
        supplierId={params.filters.supplierId}
        storageAreaId={params.filters.storageAreaId}
        {...filterOptions}
      />
      <MonthEndValueReportView lines={lines} groups={groups} grandTotal={grandTotal} groupBy={params.groupBy} centerLabel="retail" />
    </div>
  );
}
