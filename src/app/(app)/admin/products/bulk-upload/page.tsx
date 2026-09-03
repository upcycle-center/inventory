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
        <Link
          href="/api/products/csv-template"
          className="mb-4 inline-block text-sm text-brand hover:underline"
        >
          Download CSV template
        </Link>
        <CsvUploadForm suppliers={(suppliers as Supplier[] | null) ?? []} />
      </div>
    </div>
  );
}
