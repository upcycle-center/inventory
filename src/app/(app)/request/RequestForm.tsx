"use client";

import { useState, useTransition } from "react";
import { ProductQtyGrid } from "@/components/ProductQtyGrid";
import { submitRequest, saveRequestDraft, cancelRequestDraft, type RequestLineInput } from "./actions";
import { locationDisplayName } from "@/lib/locationLabel";
import type { Location } from "@/lib/supabase/types";

interface ProductForRequest {
  id: string;
  sku: string;
  description: string;
  photo_url: string | null;
  case_size: number | null;
}

export interface StorageAreaGroup {
  id: string;
  code: string;
  name: string;
  products: ProductForRequest[];
}

type QtyState = Record<string, { cases: string; each: string }>;

const CASE_OPTIONS = Array.from({ length: 5 }, (_, i) => i); // 0-4
const EACH_OPTIONS = Array.from({ length: 9 }, (_, i) => i); // 0-8

export function RequestForm({
  locations,
  productsByLocation,
  initialValues,
  initialLocationId: queryLocationId,
}: {
  locations: Location[];
  productsByLocation: Record<string, StorageAreaGroup[]>;
  initialValues?: Record<string, unknown> | null;
  initialLocationId?: string;
}) {
  const initialLocationId = (initialValues?.location_id as string | undefined) ?? queryLocationId ?? "";
  const initialLines = (initialValues?.lines as RequestLineInput[] | undefined) ?? [];

  const [locationId, setLocationId] = useState(initialLocationId);
  const [qty, setQty] = useState<QtyState>(() => {
    const state: QtyState = {};
    for (const line of initialLines) {
      state[line.product_id] = { cases: String(line.qty_cases), each: String(line.qty_each) };
    }
    return state;
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [openArea, setOpenArea] = useState<string | null>(null);
  const groups = productsByLocation[locationId] ?? [];
  const allProducts = groups.flatMap((g) => g.products);

  function buildLines(): RequestLineInput[] {
    const productsById = new Map(allProducts.map((p) => [p.id, p]));
    return Object.entries(qty)
      .map(([productId, v]) => ({ productId, cases: Number(v.cases) || 0, each: Number(v.each) || 0 }))
      .filter((l) => l.cases > 0 || l.each > 0)
      .map((l) => ({
        product_id: l.productId,
        qty_cases: l.cases,
        qty_each: l.each,
        case_size: productsById.get(l.productId)?.case_size ?? null,
      }));
  }

  function handlePost() {
    setError(null);
    setSaved(false);
    setDraftSaved(false);
    if (!locationId) {
      setError("Select a location first.");
      return;
    }
    const lines = buildLines();
    startTransition(async () => {
      const res = await submitRequest(locationId, lines);
      if (res?.error) {
        setError(res.error);
      } else {
        setSaved(true);
        setQty({});
      }
    });
  }

  function handleSaveDraft() {
    setError(null);
    setSaved(false);
    setDraftSaved(false);
    if (!locationId) {
      setError("Select a location first.");
      return;
    }
    const lines = buildLines();
    startTransition(async () => {
      const res = await saveRequestDraft(locationId, lines);
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
      await cancelRequestDraft();
      setLocationId("");
      setQty({});
    });
  }

  const filledCount = Object.values(qty).filter((v) => Number(v.cases) > 0 || Number(v.each) > 0).length;
  const hasInput = !!locationId || filledCount > 0;

  return (
    <div className="max-w-3xl">
      {initialValues && (
        <p className="mb-3 rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
          Resuming a saved draft — post it or keep editing.
        </p>
      )}

      <label className="mb-4 block text-sm text-gray-600">
        Location
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select a location…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {locationDisplayName(l)}
            </option>
          ))}
        </select>
      </label>

      {locationId && (
        <>
          <p className="mb-3 text-sm text-gray-500">
            {filledCount} item{filledCount === 1 ? "" : "s"} set — tap a product to set its quantity.
          </p>

          {!allProducts.length ? (
            <p className="text-sm text-gray-500">No products are assigned to this location yet.</p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => {
                const isOpen = openArea === group.id || (openArea === null && group === groups[0]);
                const groupFilled = group.products.filter(
                  (p) => Number(qty[p.id]?.cases) > 0 || Number(qty[p.id]?.each) > 0
                ).length;

                return (
                  <div key={group.id} className="overflow-hidden rounded-md border border-gray-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenArea(isOpen ? "__closed__" : group.id)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="font-medium">
                        {group.code} — {group.name}
                      </span>
                      <span className="text-sm text-gray-400">
                        {groupFilled}/{group.products.length} {isOpen ? "▲" : "▼"}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-gray-100 p-3">
                        <ProductQtyGrid
                          products={group.products}
                          qty={qty}
                          caseOptions={CASE_OPTIONS}
                          eachOptions={EACH_OPTIONS}
                          onSave={(productId, cases, each) => {
                            setQty((prev) => ({ ...prev, [productId]: { cases, each } }));
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {saved && !isPending && <p className="mt-4 text-sm text-green-600">✓ Request posted to the queue</p>}
      {draftSaved && !isPending && <p className="mt-4 text-sm text-yellow-700">✓ Saved for later</p>}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={handlePost}
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Submitting…" : "Post request"}
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isPending}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Save for later
        </button>
        {hasInput && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
