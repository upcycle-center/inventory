"use client";

import { useState, useTransition } from "react";
import { bulkUploadProducts } from "./csv-actions";

export function CsvUploadForm() {
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
      <input name="csv" type="file" accept=".csv,text/csv" required className="text-sm" />
      <div className="flex items-start justify-between gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="w-fit shrink-0 rounded-md bg-brand px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {isPending ? "Uploading…" : "Upload CSV"}
        </button>

        <details className="text-right">
          <summary className="cursor-pointer text-sm text-brand hover:underline">Column reference</summary>
          <div className="mt-3 max-w-md text-left text-xs text-gray-500">
            <p>
              &ldquo;CATALOG&rdquo; exports every product&apos;s real values in the same layout the
              upload expects — edit only what needs to change and re-upload it. Untouched cells
              re-apply the same value they already had, so nothing else gets overwritten.
            </p>
            <p className="mt-3">
              Columns required: <code>sku</code>, <code>description</code>. Optional:{" "}
              <code>brand</code>, <code>photo_url</code>, <code>product_type</code> (
              <code>chargeable</code>, <code>non_chargeable_bottle</code>,{" "}
              <code>non_chargeable_mixer</code>, or <code>disposable</code> — defaults to
              chargeable), <code>active</code> (<code>yes</code>/<code>no</code>),{" "}
              <code>category</code> (matched by name against Admin → Categories),{" "}
              <code>gl_code</code> (read-only, for reporting — comes from the category, ignored on
              upload), <code>supplier</code> (matched by name against Admin → Suppliers — an
              unmatched name is auto-created and flagged for review), <code>upc</code>,{" "}
              <code>case_cost</code>, <code>sale_price</code>, <code>unit_of_measure</code>,{" "}
              <code>case_size</code>. Every optional column is left alone on an update if omitted
              entirely from the header row. Existing SKUs are updated; new ones are created
              (auto-generating a code from Category + UPC if <code>sku</code> is left blank).
            </p>
            <p className="mt-3">
              For a Pour-based category (liquor/wine), add <code>bottle_size_ml</code>,{" "}
              <code>pour_size_oz</code>, and <code>pour_price</code> — TOT Retail projects that
              product&apos;s value off pours per bottle instead of Retail Value.
            </p>
            <p className="mt-3">
              For a product with a Sub-Unit tier between Case and Each (shown uniformly as
              Count/CT), add any non-blank <code>middle_unit_label</code> value to turn it on,{" "}
              <code>middle_unit_size</code> (each per Count), and <code>each_countable</code> (
              <code>yes</code>/<code>no</code> — <code>no</code> for products only ever counted by
              Case/Count, like napkins or flatware). Once <code>middle_unit_label</code> is set,{" "}
              <code>case_size</code> means Counts per case (e.g. 20 sleeves/case), not each per
              case.
            </p>
            <p className="mt-3">
              <code>pos_square</code> (<code>yes</code>/<code>no</code>) controls whether the
              product is included in Admin → Data Maps → Square POS&apos;s export.
            </p>
            <p className="mt-3">
              To also assign a location (and skip doing it by hand under Admin → Locations), add{" "}
              <code>location</code> (Yellow Dog code or location name) and{" "}
              <code>storage_area</code> (its code or name) columns, plus an optional{" "}
              <code>reorder_threshold</code>. A product going to more than one location needs one
              row per location — repeat the sku/description on each, just changing{" "}
              <code>location</code>/<code>storage_area</code>/<code>reorder_threshold</code>.
            </p>
          </div>
        </details>
      </div>
      {result && <p className="text-sm text-gray-600">{result}</p>}
    </form>
  );
}
