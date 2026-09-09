import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/lib/supabase/types";
import { CsvUploadForm } from "../CsvUploadForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function BulkUploadProductsPage() {
  const supabase = createClient();
  const { data: suppliers } = await supabase.from("suppliers").select("*").order("name");

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Products", href: "/admin/products" },
          { label: "Bulk upload" },
        ]}
      />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Bulk upload products</h1>
        <Link href="/admin/products" className="text-sm text-brand hover:underline">
          Back to products
        </Link>
      </div>

      <div className="max-w-md">
        <div className="mb-4 flex gap-4">
          <Link href="/api/products/csv-template" className="inline-block text-sm text-brand hover:underline">
            Download CSV template
          </Link>
          <Link href="/api/products/csv-export" className="inline-block text-sm text-brand hover:underline">
            Download current products
          </Link>
        </div>
        <p className="mb-4 text-xs text-gray-500">
          &ldquo;Download current products&rdquo; exports every product&apos;s real values in this
          same layout — edit only what needs to change and re-upload it. Untouched cells re-apply
          the same value they already had, so nothing else gets overwritten.
        </p>
        <CsvUploadForm suppliers={(suppliers as Supplier[] | null) ?? []} />
      </div>
    </div>
  );
}
