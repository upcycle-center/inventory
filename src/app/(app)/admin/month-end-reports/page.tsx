import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const REPORTS = [
  {
    href: "/admin/month-end-reports/inventory-value",
    label: "moEND TOT Inventory Value",
    description: "Cost value of each location's posted month-end count. Drill down by Location, then Storage Area.",
  },
  {
    href: "/admin/month-end-reports/retail-value",
    label: "moEND TOT Retail Value",
    description: "Projected retail value of each location's posted month-end count. Drill down by Location, then Storage Area.",
  },
  {
    href: "/admin/month-end-reports/waste-comps",
    label: "moEND TOT Waste & Comps",
    description: "Waste and comps logged during the month. Drill down by Location, then Storage Area.",
  },
  {
    href: "/admin/month-end-reports/call-outs",
    label: "moEND Workforce Call-Outs",
    description: "Confirmed staffing vs. recommended, across the month's events. Drill down by Location.",
  },
  {
    href: "/admin/month-end-reports/new-items",
    label: "moEND New Items Received",
    description: "Items hand-typed on a Month-End Count Sheet because they weren't in the catalog yet. Drill down by Location.",
  },
];

export default async function MonthEndReportsPage() {
  await requireProfile(["admin"]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Month-End Reports" }]} />
      <h1 className="mb-6 text-lg font-semibold">Month-End Reports</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="block rounded-md border border-gray-200 bg-white p-5 hover:border-brand"
          >
            <p className="text-sm font-semibold">{r.label}</p>
            <p className="mt-1 text-xs text-gray-500">{r.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
