"use client";

import { useState } from "react";
import { ProductPlaceholderIcon } from "@/components/ProductPlaceholderIcon";

export interface QtyGridProduct {
  id: string;
  sku: string;
  description: string;
  photo_url: string | null;
}

// Thumbnail grid where tapping a product opens a popup to set its
// quantity — avoids full-size photos crowding every cell, and keeps the
// tap target for entering a number comfortably large on a phone. Pass
// caseOptions/eachOptions to render capped dropdowns (e.g. Request);
// omit either for a free-text number input (e.g. Count, unbounded).
export function ProductQtyGrid({
  products,
  qty,
  onSave,
  caseOptions,
  eachOptions,
  showWaste,
  showComp,
}: {
  products: QtyGridProduct[];
  qty: Record<string, { cases: string; each: string; waste?: string; comp?: string }>;
  onSave: (productId: string, cases: string, each: string, waste: string, comp: string) => void;
  caseOptions?: number[];
  eachOptions?: number[];
  showWaste?: boolean;
  showComp?: boolean;
}) {
  const [activeProduct, setActiveProduct] = useState<QtyGridProduct | null>(null);
  const [draftCases, setDraftCases] = useState("");
  const [draftEach, setDraftEach] = useState("");
  const [draftWaste, setDraftWaste] = useState("");
  const [draftComp, setDraftComp] = useState("");

  function openPopup(p: QtyGridProduct) {
    setActiveProduct(p);
    setDraftCases(qty[p.id]?.cases ?? "");
    setDraftEach(qty[p.id]?.each ?? "");
    setDraftWaste(qty[p.id]?.waste ?? "");
    setDraftComp(qty[p.id]?.comp ?? "");
  }

  function confirmPopup() {
    if (activeProduct) onSave(activeProduct.id, draftCases, draftEach, draftWaste, draftComp);
    setActiveProduct(null);
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {products.map((p) => {
          const cases = qty[p.id]?.cases;
          const each = qty[p.id]?.each;
          const waste = qty[p.id]?.waste;
          const comp = qty[p.id]?.comp;
          const filled =
            (!!cases && cases !== "0") || (!!each && each !== "0") || (!!waste && waste !== "0") || (!!comp && comp !== "0");
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => openPopup(p)}
              className={`rounded-md border p-2 text-left ${filled ? "border-brand ring-1 ring-brand" : "border-gray-200"}`}
            >
              <div className="mb-2 flex aspect-square w-full items-center justify-center overflow-hidden rounded bg-gray-50">
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt={p.description} className="h-full w-full object-contain" />
                ) : (
                  <ProductPlaceholderIcon />
                )}
              </div>
              <p className="truncate text-xs font-medium" title={p.description}>
                {p.description}
              </p>
              <p className="text-[11px] text-gray-400">{p.sku}</p>
              {filled && (
                <p className="mt-1 truncate text-[11px] font-medium text-brand">
                  {cases && cases !== "0" ? `${cases} CS ` : ""}
                  {each && each !== "0" ? `${each} EA ` : ""}
                  {waste && waste !== "0" ? `· ${waste} waste ` : ""}
                  {comp && comp !== "0" ? `· ${comp} comp` : ""}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {activeProduct && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveProduct(null)}
          onKeyDown={(e) => e.key === "Escape" && setActiveProduct(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
        >
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-lg bg-white p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-50">
                {activeProduct.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeProduct.photo_url} alt={activeProduct.description} className="h-full w-full object-contain" />
                ) : (
                  <ProductPlaceholderIcon />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{activeProduct.description}</p>
                <p className="text-xs text-gray-400">{activeProduct.sku}</p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-500">
                CS
                {caseOptions ? (
                  <select
                    value={draftCases || "0"}
                    onChange={(e) => setDraftCases(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                  >
                    {caseOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={draftCases}
                    onChange={(e) => setDraftCases(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                  />
                )}
              </label>
              <label className="text-xs text-gray-500">
                EA
                {eachOptions ? (
                  <select
                    value={draftEach || "0"}
                    onChange={(e) => setDraftEach(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                  >
                    {eachOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={draftEach}
                    onChange={(e) => setDraftEach(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                  />
                )}
              </label>
            </div>

            {(showWaste || showComp) && (
              <div className="mb-4 grid grid-cols-2 gap-3">
                {showWaste && (
                  <label className="text-xs text-gray-500">
                    Waste (EA)
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={draftWaste}
                      onChange={(e) => setDraftWaste(e.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                    />
                  </label>
                )}
                {showComp && (
                  <label className="text-xs text-gray-500">
                    Comp (EA)
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={draftComp}
                      onChange={(e) => setDraftComp(e.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                    />
                  </label>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={confirmPopup} className="flex-1 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white">
                Set
              </button>
              <button
                type="button"
                onClick={() => setActiveProduct(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
