import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/lib/supabase/types";
import { deleteSupplier, markSupplierReviewed } from "./actions";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdminSuppliersPage() {
  const supabase = createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");
  const needsReviewCount = ((suppliers as Supplier[] | null) ?? []).filter((s) => s.needs_review).length;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Suppliers" }]} />
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Suppliers</h1>
        <Link href="/admin/suppliers/new" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Add New Supplier
        </Link>
      </div>
      {needsReviewCount > 0 && (
        <p className="mb-4 text-sm text-amber-700">
          {needsReviewCount} supplier{needsReviewCount === 1 ? "" : "s"} auto-created from a CSV upload need
          {needsReviewCount === 1 ? "s" : ""} review — check for typos/duplicates below.
        </p>
      )}

      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-gray-500">
          <tr>
            <th className="pb-2">Name</th>
            <th className="pb-2">Contact</th>
            <th className="pb-2">Status</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {(suppliers as Supplier[] | null)?.map((s) => (
            <tr key={s.id} className="border-t border-gray-100">
              <td className="py-2">
                <Link href={`/admin/suppliers/${s.id}`} className="font-medium text-brand hover:underline">
                  {s.name}
                </Link>
              </td>
              <td className="py-2 text-gray-500">
                {[
                  [s.representative_first_name, s.representative_last_name].filter(Boolean).join(" ") || null,
                  s.representative_email,
                  s.representative_phone,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </td>
              <td className="py-2">
                {s.needs_review ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Needs review</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="py-2 text-right">
                <div className="flex items-center justify-end gap-3">
                  {s.needs_review && (
                    <form action={markSupplierReviewed}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="text-brand hover:underline">
                        Mark reviewed
                      </button>
                    </form>
                  )}
                  <form action={deleteSupplier}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          {!suppliers?.length && (
            <tr>
              <td colSpan={4} className="py-4 text-gray-400">
                No suppliers yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
