"use client";

import { useState, useTransition } from "react";
import type { Supplier } from "@/lib/supabase/types";
import { bulkUploadProducts } from "./csv-actions";

export function CsvUploadForm({ suppliers }: { suppliers: Supplier[] }) {
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const res = await bulkUploadProducts(formData);
          setResult(res.message);
        });
      }}
      className="grid gap-3 rounded-md border border-gray-200 bg-white p-4"
    >
      <p className="text-sm font-medium">Bulk upload from a supplier CSV</p>
      <p className="text-xs text-gray-500">
        Columns required: <code>sku</code>, <code>description</code>. Optional:{" "}
        <code>upc</code>, <code>case_cost</code>, <code>sale_price</code>,{" "}
        <code>unit_of_measure</code>, <code>case_size</code>. Existing
        ICs are updated; new ones are created (with an auto-generated internal barcode).
      </p>
      <select name="supplier_id" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
        <option value="">No supplier</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input name="csv" type="file" accept=".csv,text/csv" required className="text-sm" />
      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-md border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
      >
        {isPending ? "Uploading…" : "Upload CSV"}
      </button>
      {result && <p className="text-sm text-gray-600">{result}</p>}
    </form>
  );
}
