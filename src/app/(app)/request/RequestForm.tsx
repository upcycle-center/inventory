"use client";

import { useRef, useState, useTransition } from "react";
import type { Location, Product } from "@/lib/supabase/types";
import { submitRequest, saveRequestDraft } from "./actions";

export function RequestForm({
  products,
  locations,
  initialValues,
}: {
  products: Product[];
  locations: Location[];
  initialValues?: Record<string, unknown> | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const v = (key: string) => (initialValues?.[key] as string | undefined) ?? "";

  function handlePost() {
    if (!formRef.current) return;
    setError(null);
    setSaved(false);
    setDraftSaved(false);
    const formData = new FormData(formRef.current);
    startTransition(async () => {
      const res = await submitRequest(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setSaved(true);
        formRef.current?.reset();
      }
    });
  }

  function handleSaveDraft() {
    if (!formRef.current) return;
    setError(null);
    setSaved(false);
    setDraftSaved(false);
    const formData = new FormData(formRef.current);
    startTransition(async () => {
      const res = await saveRequestDraft(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setDraftSaved(true);
      }
    });
  }

  return (
    <form ref={formRef} id="request-form" className="grid max-w-lg gap-3 rounded-md border border-gray-200 bg-white p-4">
      {initialValues && (
        <p className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
          Resuming a saved draft — post it or keep editing.
        </p>
      )}

      <label className="text-sm text-gray-600">
        Product
        <select name="product_id" required defaultValue={v("product_id")} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Select a product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} — {p.description}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-gray-600">
        Location
        <select name="location_id" required defaultValue={v("location_id")} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Select a location…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-gray-600">
        Quantity to restock (optional)
        <input
          name="reorder_qty"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Leave blank to keep the current restock quantity"
          defaultValue={v("reorder_qty")}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !isPending && <p className="text-sm text-green-600">✓ Request posted to the queue</p>}
      {draftSaved && !isPending && <p className="text-sm text-yellow-700">✓ Saved for later</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePost}
          disabled={isPending}
          className="w-fit rounded-md bg-brand px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {isPending ? "Submitting…" : "Post request"}
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isPending}
          className="w-fit rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Save for later
        </button>
      </div>
    </form>
  );
}
