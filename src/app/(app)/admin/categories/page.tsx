import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ProductCategory } from "@/lib/supabase/types";
import { createCategory } from "./actions";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdminCategoriesPage() {
  const supabase = createClient();
  const { data: categoriesRaw } = await supabase.from("product_categories").select("*").order("name");
  const categories = (categoriesRaw as ProductCategory[] | null) ?? [];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Categories" }]} />
      <h1 className="mb-2 text-lg font-semibold">Categories</h1>
      <p className="mb-6 text-sm text-gray-500">
        Each product&apos;s GL Code comes from its category. Whether TOT Retail projects pours or
        uses Retail Value is decided by the product&apos;s own Type instead, not its category.
      </p>

      <ActionForm
        action={createCategory}
        savedLabel="Category added"
        className="mb-8 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <div>
          <label className="mb-1 block text-xs text-gray-500">Name</label>
          <input name="name" placeholder="e.g. Liquor" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">GL Code</label>
          <input name="gl_code" placeholder="e.g. 5010" className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Add
        </button>
      </ActionForm>

      <table className="w-full max-w-md text-left text-sm">
        <thead className="text-gray-500">
          <tr>
            <th className="pb-2">Name</th>
            <th className="pb-2">GL Code</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id} className="border-t border-gray-100">
              <td className="py-2">
                <Link href={`/admin/categories/${c.id}`} className="text-brand hover:underline">
                  {c.name}
                </Link>
              </td>
              <td className="py-2 font-mono text-gray-500">{c.gl_code ?? "—"}</td>
            </tr>
          ))}
          {!categories.length && (
            <tr>
              <td colSpan={2} className="py-6 text-center text-gray-400">
                No categories yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
