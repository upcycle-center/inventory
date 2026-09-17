import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ProductCsvEvent } from "@/lib/supabase/types";
import { CsvUploadForm } from "../CsvUploadForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { easternDateTimeString } from "@/lib/easternTime";

const KIND_LABEL: Record<string, string> = {
  bulk_upload: "Upload",
  template: "Template download",
  export: "Catalog download",
};

export default async function BulkUploadProductsPage() {
  const supabase = createClient();
  const { data: eventsRaw } = await supabase
    .from("product_csv_events")
    .select("*, performed_by_profile:profiles(id, name)")
    .order("created_at", { ascending: false })
    .limit(50);

  const events = (eventsRaw as (ProductCsvEvent & { performed_by_profile: { name: string } | null })[] | null) ?? [];
  const downloadUrlByPath = new Map<string, string>();
  for (const e of events) {
    if (e.storage_path && !downloadUrlByPath.has(e.storage_path)) {
      const { data } = await supabase.storage.from("product-csv-uploads").createSignedUrl(e.storage_path, 3600);
      if (data?.signedUrl) downloadUrlByPath.set(e.storage_path, data.signedUrl);
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Products", href: "/admin/products" },
          { label: "Data Map CSV" },
        ]}
      />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Data Map CSV</h1>
        <Link href="/admin/products" className="text-sm text-brand hover:underline">
          Back to products
        </Link>
      </div>

      <div className="max-w-md">
        <div className="mb-6 flex gap-4">
          <Link href="/api/products/csv-template" className="inline-block text-sm text-brand hover:underline">
            Download CSV template
          </Link>
          <Link href="/api/products/csv-export" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
            CATALOG
            <DownloadIcon />
          </Link>
        </div>
        <CsvUploadForm />
      </div>

      <details className="mt-6 max-w-3xl rounded-md border border-gray-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">Upload / download log</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="px-2 py-1.5">Date</th>
                <th className="px-2 py-1.5">Type</th>
                <th className="px-2 py-1.5">File</th>
                <th className="px-2 py-1.5">By</th>
                <th className="px-2 py-1.5">Result</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-gray-100">
                  <td className="px-2 py-1.5 text-gray-400">{easternDateTimeString(new Date(e.created_at))}</td>
                  <td className="px-2 py-1.5">{KIND_LABEL[e.kind] ?? e.kind}</td>
                  <td className="px-2 py-1.5">
                    {e.storage_path && downloadUrlByPath.has(e.storage_path) ? (
                      <a href={downloadUrlByPath.get(e.storage_path)} className="text-brand hover:underline">
                        {e.filename ?? "download"}
                      </a>
                    ) : (
                      e.filename ?? "—"
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-gray-500">{e.performed_by_profile?.name ?? "—"}</td>
                  <td className="max-w-md truncate px-2 py-1.5 text-gray-500" title={e.result_message ?? undefined}>
                    {e.result_message ?? "—"}
                  </td>
                </tr>
              ))}
              {!events.length && (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-gray-400">
                    No CSV activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" aria-hidden="true">
      <path d="M8 1.5v8.5m0 0L4.5 6.5M8 10l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 12v1a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
