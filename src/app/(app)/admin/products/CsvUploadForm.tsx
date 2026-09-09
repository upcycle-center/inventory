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
        <code>upc</code>, <code>product_type</code> (<code>chargeable</code>,{" "}
        <code>non_chargeable_bottle</code>, <code>non_chargeable_mixer</code>, or{" "}
        <code>disposable</code> — defaults to chargeable, and is left alone on an update if omitted),{" "}
        <code>category</code> (matched by name against Admin → Categories — also left alone on an
        update if omitted), <code>supplier</code> (matched by name against Admin → Suppliers — also
        left alone on an update if omitted; overrides the dropdown below, which only applies when
        no <code>supplier</code> column exists at all), <code>case_cost</code>,{" "}
        <code>sale_price</code>, <code>unit_of_measure</code>, <code>case_size</code>. Existing
        SKUs are updated; new ones are created (with an auto-generated internal barcode).
      </p>
      <p className="text-xs text-gray-500">
        For a Pour-based category (liquor/wine), add <code>bottle_size_ml</code>,{" "}
        <code>pour_size_oz</code>, and <code>pour_price</code> — TOT Retail projects that
        product&apos;s value off pours per bottle instead of Retail Value.
      </p>
      <p className="text-xs text-gray-500">
        To also assign a location (and skip doing it by hand under Admin → Locations), add{" "}
        <code>location</code> (Yellow Dog code or location name) and <code>storage_area</code>{" "}
        (its code or name) columns, plus an optional <code>reorder_threshold</code>. A product
        going to more than one location needs one row per location — repeat the sku/description on
        each, just changing <code>location</code>/<code>storage_area</code>/<code>reorder_threshold</code>.
      </p>
      <label className="text-xs text-gray-500">
        Supplier for every row (only used if the CSV has no <code>supplier</code> column)
        <select name="supplier_id" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">No supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
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
