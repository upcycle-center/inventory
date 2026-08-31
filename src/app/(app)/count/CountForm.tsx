"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductPlaceholderIcon } from "@/components/ProductPlaceholderIcon";
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
}: {
  eventId: string;
  locationId: string;
  type: CountType;
  groups: StorageAreaGroup[];
}) {
  const router = useRouter();
  const [openArea, setOpenArea] = useState<string | null>(groups[0]?.id ?? null);
  const [qty, setQty] = useState<QtyState>({});
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
                <div className="grid grid-cols-2 gap-3 border-t border-gray-100 p-4 sm:grid-cols-3">
                  {group.products.map((product) => (
                    <div key={product.id} className="rounded-md border border-gray-100 p-2">
                      <div className="mb-2 flex h-20 items-center justify-center overflow-hidden rounded bg-gray-50">
                        {product.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.photo_url}
                            alt={product.description}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ProductPlaceholderIcon />
                        )}
                      </div>
                      <p className="mb-1 truncate text-xs font-medium" title={product.description}>
                        {product.description}
                      </p>
                      <p className="mb-2 text-[11px] text-gray-400">{product.sku}</p>
                      <div className="grid grid-cols-2 gap-1">
                        <label className="text-[10px] text-gray-500">
                          EA
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            value={qty[product.id]?.each ?? ""}
                            onChange={(e) => setValue(product.id, "each", e.target.value)}
                            className="mt-0.5 w-full rounded border border-gray-300 px-1.5 py-1 text-sm"
                          />
                        </label>
                        <label className="text-[10px] text-gray-500">
                          CS
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            value={qty[product.id]?.cases ?? ""}
                            onChange={(e) => setValue(product.id, "cases", e.target.value)}
                            className="mt-0.5 w-full rounded border border-gray-300 px-1.5 py-1 text-sm"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
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
