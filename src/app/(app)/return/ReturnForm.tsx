"use client";

import { useState, useTransition } from "react";
import type { Location, Product, Supplier } from "@/lib/supabase/types";
import { submitReturn, RETURN_REASONS } from "./actions";

export function ReturnForm({
  products,
  locations,
  suppliers,
}: {
  products: Product[];
  locations: Location[];
  suppliers: Supplier[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const res = await submitReturn(formData);
          if (res?.error) {
            setError(res.error);
          } else {
            setSaved(true);
            (document.getElementById("return-form") as HTMLFormElement | null)?.reset();
          }
        });
      }}
      id="return-form"
      className="grid max-w-lg gap-3 rounded-md border border-gray-200 bg-white p-4"
    >
      <label className="text-sm text-gray-600">
        Product
        <select name="product_id" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Select a product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} — {p.description}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-gray-600">
        Returning from
        <select name="from_location_id" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Select a location…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-gray-600">
        Supplier
        <select name="supplier_id" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Select a supplier…</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-gray-600">
        Quantity
        <input name="quantity" type="number" step="0.01" min="0.01" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </label>

      <label className="text-sm text-gray-600">
        Reason
        <select name="reason_code" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Select a reason…</option>
          {RETURN_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-gray-600">
        Note (optional)
        <textarea name="note" rows={2} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !isPending && <p className="text-sm text-green-600">✓ Return logged</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-md bg-brand px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Log return"}
      </button>
    </form>
  );
}
