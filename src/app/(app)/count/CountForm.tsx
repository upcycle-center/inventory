"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductQtyGrid } from "@/components/ProductQtyGrid";
import { submitCount, type CountLineInput } from "./actions";
import type { CountType } from "@/lib/supabase/types";

interface ProductForCount {
  id: string;
  sku: string;
  description: string;
  photo_url: string | null;
}

interface StorageAreaGroup {
  id: string;
  code: string;
  name: string;
  products: ProductForCount[];
}

type QtyState = Record<string, { each: string; cases: string; waste?: string }>;

export function CountForm({
  eventId,
  locationId,
  type,
  groups,
  initialQty,
}: {
  eventId: string;
  locationId: string;
  type: CountType;
  groups: StorageAreaGroup[];
  initialQty?: QtyState;
}) {
  const router = useRouter();
  const [openArea, setOpenArea] = useState<string | null>(groups[0]?.id ?? null);
  const [qty, setQty] = useState<QtyState>(initialQty ?? {});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filledCount = Object.values(qty).filter((v) => v.each.trim() || v.cases.trim()).length;

  function handleSubmit() {
    setError(null);
    const lines: CountLineInput[] = Object.entries(qty)
      .map(([productId, v]) => ({
        product_id: productId,
        qty_each: v.each.trim() === "" ? null : Number(v.each),
        qty_cases: v.cases.trim() === "" ? null : Number(v.cases),
      }))
      .filter((l) => l.qty_each !== null || l.qty_cases !== null);

    if (lines.length === 0) {
      setError("Enter at least one quantity before submitting.");
      return;
    }

    const wasteLines =
      type === "closing"
        ? Object.entries(qty)
            .filter(([, v]) => v.waste && Number(v.waste) > 0)
            .map(([productId, v]) => ({ product_id: productId, quantity: Number(v.waste) }))
        : [];

    startTransition(async () => {
      const res = await submitCount(eventId, locationId, type, lines, notes, wasteLines);
      if (res?.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold capitalize">{type} Count</h1>
        <span className="text-sm text-gray-500">{filledCount} item{filledCount === 1 ? "" : "s"} entered</span>
      </div>
      {type === "opening" && filledCount > 0 && (
        <p className="mb-4 text-xs text-gray-400">
          Pre-filled from the location&apos;s last closing count — adjust any quantities that have changed.
        </p>
      )}

      <div className="space-y-3">
        {groups.map((group) => {
          const isOpen = openArea === group.id;
          const groupFilled = group.products.filter(
            (p) => qty[p.id]?.each.trim() || qty[p.id]?.cases.trim()
          ).length;

          return (
            <div key={group.id} className="overflow-hidden rounded-md border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setOpenArea(isOpen ? null : group.id)}
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
                    showWaste={type === "closing"}
                    onSave={(productId, cases, each, waste) => {
                      setQty((prev) => ({ ...prev, [productId]: { cases, each, waste } }));
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <label className="mt-4 block text-sm text-gray-600">
        Comment (optional)
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Notes, things to flag for the next shift, etc."
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="mt-6 w-full rounded-md bg-brand px-4 py-3 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
      >
        {isPending ? "Submitting…" : `Submit ${type} count`}
      </button>
    </div>
  );
}
