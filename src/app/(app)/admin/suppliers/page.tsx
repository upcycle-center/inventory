import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/lib/supabase/types";
import { markSupplierReviewed } from "./actions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DownloadIcon } from "@/components/DownloadIcon";
import { requireProfile } from "@/lib/auth";

export default async function AdminSuppliersPage() {
  const profile = await requireProfile();
  const canEdit = profile.role === "admin";
  const supabase = createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");
  const needsReviewCount = ((suppliers as Supplier[] | null) ?? []).filter((s) => s.needs_review).length;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Suppliers" }]} />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="text-lg font-semibold">Suppliers</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a href="/api/suppliers/csv-export" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
            CSV
            <DownloadIcon />
          </a>
          <a href="/api/suppliers/pdf" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
            PDF
            <DownloadIcon />
          </a>
          {canEdit && (
            <Link href="/admin/suppliers/new" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
              Add New Supplier
            </Link>
          )}
        </div>
      </div>
      {needsReviewCount > 0 && (
        <p className="mb-4 text-sm text-amber-700">
          {needsReviewCount} supplier{needsReviewCount === 1 ? "" : "s"} auto-created from a CSV upload need
          {needsReviewCount === 1 ? "s" : ""} review — check for typos/duplicates below.
        </p>
      )}

      <div className="rounded-md border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-3">Company</th>
              <th className="px-3 py-3">Acct #</th>
              <th className="px-3 py-3">Acct Rep</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Mobile</th>
              <th className="px-3 py-3">Website</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(suppliers as Supplier[] | null)?.map((s) => (
              <tr key={s.id} className="border-t border-gray-100">
                <td className="px-3 py-3">
                  <Link href={`/admin/suppliers/${s.id}`} className="font-medium text-brand hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="px-3 py-3 text-gray-500">{s.account_number || "—"}</td>
                <td className="px-3 py-3 text-gray-500">
                  {[s.representative_first_name, s.representative_last_name].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="max-w-[180px] truncate px-3 py-3 text-gray-500">{s.representative_email || "—"}</td>
                <td className="px-3 py-3 text-gray-500">{s.representative_phone || "—"}</td>
                <td className="max-w-[160px] truncate px-3 py-3 text-gray-500">{s.website || "—"}</td>
                <td className="px-3 py-3 text-right">
                  {s.needs_review && canEdit && (
                    <form action={markSupplierReviewed}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="text-brand hover:underline">
                        Mark reviewed
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {!suppliers?.length && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
                  No suppliers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
