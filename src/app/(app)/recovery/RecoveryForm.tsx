"use client";

import { useState, useTransition } from "react";
import { ProductQtyGrid } from "@/components/ProductQtyGrid";
import { submitRecovery, saveRecoveryDraft, cancelRecoveryDraft, type RecoveryLineInput } from "./actions";
import { locationDisplayName } from "@/lib/locationLabel";
import type { Location } from "@/lib/supabase/types";

interface ProductForRecovery {
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
  products: ProductForRecovery[];
}

type QtyState = Record<string, { cases: string; each: string }>;

export function RecoveryForm({
  locations,
  warehouses,
  productsByLocation,
  initialValues,
  initialFromLocationId,
}: {
  locations: Location[];
  warehouses: Location[];
  productsByLocation: Record<string, StorageAreaGroup[]>;
  initialValues?: Record<string, unknown> | null;
  initialFromLocationId?: string;
}) {
  const initialFromId = (initialValues?.from_location_id as string | undefined) ?? initialFromLocationId ?? "";
  const initialToId =
    (initialValues?.to_location_id as string | undefined) ?? (warehouses.length === 1 ? warehouses[0].id : "");
  const initialLines = (initialValues?.lines as RecoveryLineInput[] | undefined) ?? [];

  const [fromLocationId, setFromLocationId] = useState(initialFromId);
  const [toLocationId, setToLocationId] = useState(initialToId);
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
  const groups = productsByLocation[fromLocationId] ?? [];
  const allProducts = groups.flatMap((g) => g.products);

  function buildLines(): RecoveryLineInput[] {
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
    if (!fromLocationId || !toLocationId) {
      setError("Select a From and To warehouse first.");
      return;
    }
    if (fromLocationId === toLocationId) {
      setError("From and To locations must be different.");
      return;
    }
    const lines = buildLines();
    startTransition(async () => {
      const res = await submitRecovery(fromLocationId, toLocationId, lines);
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
    if (!fromLocationId || !toLocationId) {
      setError("Select a From and To warehouse first.");
      return;
    }
    const lines = buildLines();
    startTransition(async () => {
      const res = await saveRecoveryDraft(fromLocationId, toLocationId, lines);
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
      await cancelRecoveryDraft();
      setFromLocationId("");
      setToLocationId("");
      setQty({});
    });
  }

  const filledCount = Object.values(qty).filter((v) => Number(v.cases) > 0 || Number(v.each) > 0).length;
  const hasInput = !!fromLocationId || filledCount > 0;
  const bothSet = !!fromLocationId && !!toLocationId;

  return (
    <div className="max-w-3xl">
      {initialValues && (
        <p className="mb-3 rounded-md bg-orange-50 px-3 py-2 text-xs text-orange-700">
          Resuming a saved draft — post it or keep editing.
        </p>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm text-gray-600">
          From
          <select
            value={fromLocationId}
            onChange={(e) => {
              setFromLocationId(e.target.value);
              setQty({});
              setOpenArea(null);
            }}
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

        <label className="block text-sm text-gray-600">
          To (Warehouse)
          <select
            value={toLocationId}
            onChange={(e) => setToLocationId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select a warehouse…</option>
            {warehouses
              .filter((l) => l.id !== fromLocationId)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {locationDisplayName(l)}
                </option>
              ))}
          </select>
        </label>
      </div>

      {bothSet && (
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
      {saved && !isPending && <p className="mt-4 text-sm text-green-600">✓ Recovery logged</p>}
      {draftSaved && !isPending && <p className="mt-4 text-sm text-orange-700">✓ Saved for later</p>}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={handlePost}
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Submitting…" : "Log recovery"}
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
