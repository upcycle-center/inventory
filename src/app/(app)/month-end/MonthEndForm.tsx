"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductQtyGrid } from "@/components/ProductQtyGrid";
import { submitMonthEndCount, type MonthEndLineInput, type MonthEndNewItemInput } from "./actions";
import { locationDisplayName } from "@/lib/locationLabel";
import type { Location } from "@/lib/supabase/types";

interface ProductForMonthEnd {
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
  products: ProductForMonthEnd[];
}

type QtyState = Record<string, { cases: string; each: string }>;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

let newItemKeySeq = 0;
function blankNewItem() {
  return { key: `n${++newItemKeySeq}`, barcode: "", brand: "", product_name: "", case_count: "", size_each: "" };
}

export function MonthEndForm({
  locations,
  productsByLocation,
  defaultYear,
  defaultMonth,
}: {
  locations: Location[];
  productsByLocation: Record<string, StorageAreaGroup[]>;
  defaultYear: number;
  defaultMonth: number;
}) {
  const router = useRouter();
  const [locationId, setLocationId] = useState("");
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [qty, setQty] = useState<QtyState>({});
  const [newItems, setNewItems] = useState<ReturnType<typeof blankNewItem>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const groups = productsByLocation[locationId] ?? [];
  const filledCount = Object.values(qty).filter((v) => v.each.trim() || v.cases.trim()).length;

  function updateNewItem(key: string, field: keyof ReturnType<typeof blankNewItem>, value: string) {
    setNewItems((prev) => prev.map((n) => (n.key === key ? { ...n, [field]: value } : n)));
  }

  function buildLines(): MonthEndLineInput[] {
    return Object.entries(qty)
      .map(([productId, v]) => ({
        product_id: productId,
        qty_each: v.each.trim() === "" ? null : Number(v.each),
        qty_cases: v.cases.trim() === "" ? null : Number(v.cases),
      }))
      .filter((l) => l.qty_each !== null || l.qty_cases !== null);
  }

  function buildNewItems(): MonthEndNewItemInput[] {
    return newItems
      .filter((n) => n.product_name.trim())
      .map((n) => ({
        barcode: n.barcode,
        brand: n.brand,
        product_name: n.product_name,
        case_count: n.case_count.trim() === "" ? null : Number(n.case_count),
        size_each: n.size_each,
      }));
  }

  function handleSubmit() {
    setError(null);
    setSaved(false);
    if (!locationId) {
      setError("Select a location first.");
      return;
    }
    const lines = buildLines();
    const items = buildNewItems();
    if (!lines.length && !items.length) {
      setError("Enter at least one quantity or new item before submitting.");
      return;
    }

    startTransition(async () => {
      const res = await submitMonthEndCount(locationId, year, month, lines, items);
      if (res?.error) {
        setError(res.error);
      } else {
        setSaved(true);
        setQty({});
        setNewItems([]);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block text-sm text-gray-600">
          Location
          <select
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
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
          Month
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-gray-600">
          Year
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {!locationId ? (
        <p className="text-sm text-gray-500">Select a location to begin.</p>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {MONTH_NAMES[month - 1]} {year} — physical count
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{filledCount} item{filledCount === 1 ? "" : "s"} entered</span>
              <a
                href={`/api/month-end/pdf?location=${locationId}&year=${year}&month=${month}`}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                Download PDF
              </a>
            </div>
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
            {!groups.length && (
              <p className="text-sm text-gray-500">No products are assigned to this location.</p>
            )}
          </div>

          <div className="mt-8">
            <p className="mb-1 text-sm font-medium">New / unlisted items</p>
            <p className="mb-3 text-sm text-gray-500">
              Found on the shelf but not listed above? Add it here — it&apos;s reported to a
              YellowDog manager to add to the catalog, not added to on-hand automatically.
            </p>
            <div className="space-y-3">
              {newItems.map((n) => (
                <div key={n.key} className="grid grid-cols-1 gap-2 rounded-md border border-gray-200 bg-white p-3 sm:grid-cols-6">
                  <input
                    placeholder="Barcode"
                    value={n.barcode}
                    onChange={(e) => updateNewItem(n.key, "barcode", e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm sm:col-span-1"
                  />
                  <input
                    placeholder="Brand"
                    value={n.brand}
                    onChange={(e) => updateNewItem(n.key, "brand", e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm sm:col-span-1"
                  />
                  <input
                    placeholder="Product name"
                    value={n.product_name}
                    onChange={(e) => updateNewItem(n.key, "product_name", e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm sm:col-span-2"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Case count"
                    value={n.case_count}
                    onChange={(e) => updateNewItem(n.key, "case_count", e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm sm:col-span-1"
                  />
                  <div className="flex gap-2 sm:col-span-1">
                    <input
                      placeholder="Size each"
                      value={n.size_each}
                      onChange={(e) => updateNewItem(n.key, "size_each", e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setNewItems((prev) => prev.filter((x) => x.key !== n.key))}
                      className="shrink-0 rounded-md border border-gray-300 px-2 text-sm text-gray-500 hover:bg-gray-50"
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setNewItems((prev) => [...prev, blankNewItem()])}
              className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              + Add another item
            </button>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {saved && <p className="mt-4 text-sm text-green-600">✓ Month-End count posted.</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="mt-6 w-full rounded-md bg-brand px-4 py-3 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
          >
            {isPending ? "Submitting…" : "Submit Month-End Count"}
          </button>
        </>
      )}
    </div>
  );
}
