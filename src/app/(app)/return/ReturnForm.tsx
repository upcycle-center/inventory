"use client";

import { useRef, useState, useTransition } from "react";
import type { Location, Product, Supplier } from "@/lib/supabase/types";
import { locationDisplayName } from "@/lib/locationLabel";
import { submitReturn, saveReturnDraft, cancelReturnDraft, RETURN_REASONS } from "./actions";

export function ReturnForm({
  products,
  locations,
  suppliers,
  initialValues,
}: {
  products: Product[];
  locations: Location[];
  suppliers: Supplier[];
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
      const res = await submitReturn(formData);
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
      const res = await saveReturnDraft(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setDraftSaved(true);
      }
    });
  }

  function handleCancel() {
    setError(null);
    setSaved(false);
    setDraftSaved(false);
    startTransition(async () => {
      await cancelReturnDraft();
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} id="return-form" className="grid max-w-lg gap-3 rounded-md border border-gray-200 bg-white p-4">
      {initialValues && (
        <p className="rounded-md bg-fuchsia-50 px-3 py-2 text-xs text-fuchsia-700">
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
        Returning from
        <select name="from_location_id" required defaultValue={v("from_location_id")} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Select a location…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {locationDisplayName(l)}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-gray-600">
        Supplier
        <select name="supplier_id" required defaultValue={v("supplier_id")} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
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
        <input
          name="quantity"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={v("quantity")}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-sm text-gray-600">
        Reason
        <select name="reason_code" required defaultValue={v("reason_code")} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
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
        <textarea name="note" rows={2} defaultValue={v("note")} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !isPending && <p className="text-sm text-green-600">✓ Return logged</p>}
      {draftSaved && !isPending && <p className="text-sm text-fuchsia-700">✓ Saved for later</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePost}
          disabled={isPending}
          className="w-fit rounded-md bg-brand px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {isPending ? "Submitting…" : "Log return"}
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isPending}
          className="w-fit rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Save for later
        </button>
        {initialValues && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="w-fit rounded-md border border-gray-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
