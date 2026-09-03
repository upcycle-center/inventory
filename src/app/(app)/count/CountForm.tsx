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

type QtyState = Record<string, { each: string; cases: string }>;

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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setValue(productId: string, field: "each" | "cases", value: string) {
    setQty((prev) => ({
      ...prev,
      [productId]: { each: prev[productId]?.each ?? "", cases: prev[productId]?.cases ?? "", [field]: value },
    }));
  }

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

    startTransition(async () => {
      const res = await submitCount(eventId, locationId, type, lines);
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
