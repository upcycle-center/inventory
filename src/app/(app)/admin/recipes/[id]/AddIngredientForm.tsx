"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { ProductSearchSelect } from "@/components/ProductSearchSelect";
import type { ProductTypeValue } from "@/lib/productType";
import { addIngredient } from "./actions";

interface IngredientProduct {
  id: string;
  description: string;
  product_type: ProductTypeValue;
}

const ROLE_OPTIONS: { value: string; label: string; types: ProductTypeValue[] | null }[] = [
  { value: "all", label: "All", types: null },
  { value: "alcohol", label: "Alcohol", types: ["non_chargeable_bottle"] },
  { value: "mixer", label: "Mixer", types: ["non_chargeable_mixer"] },
  { value: "top_off", label: "Top Off", types: ["chargeable", "non_chargeable_mixer"] },
  { value: "garnish", label: "Garnish", types: ["garnish"] },
];

// Standalone submit handling instead of the shared ActionForm -- Role and
// the product search box are controlled React state (needed for live
// filtering/autocomplete), so a plain form.reset() after success wouldn't
// clear them the way it clears native inputs. Remounting via `formKey`
// after a successful add does instead.
export function AddIngredientForm({ recipeId, products }: { recipeId: string; products: IngredientProduct[] }) {
  const [role, setRole] = useState("all");
  const [formKey, setFormKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const formRef = useRef<HTMLFormElement>(null);

  const filtered = useMemo(() => {
    const types = ROLE_OPTIONS.find((r) => r.value === role)?.types;
    if (!types) return products;
    return products.filter((p) => types.includes(p.product_type));
  }, [products, role]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setStatus("idle");
    startTransition(async () => {
      await addIngredient(formData);
      setRole("all");
      setFormKey((k) => k + 1);
      setStatus("saved");
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
    >
      <input type="hidden" name="recipe_id" value={recipeId} />
      <div>
        <label className="mb-1 block text-xs text-gray-500">Ingredient</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="w-64">
        <label className="mb-1 block text-xs text-gray-500">Product</label>
        <ProductSearchSelect key={formKey} products={filtered} name="product_id" placeholder="Type to search…" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Qty (oz)</label>
        <input key={formKey} name="quantity_oz" type="number" min={0.01} step={0.01} className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <label className="flex items-center gap-1.5 pb-2 text-xs text-gray-500">
        <input key={formKey} type="checkbox" name="top_off" className="h-4 w-4" />
        Top Off (2oz std)
      </label>
      <button type="submit" disabled={isPending} className="rounded-md bg-brand px-4 py-2 text-sm text-white disabled:opacity-50">
        {isPending ? "Adding…" : "Add ingredient"}
      </button>
      {!isPending && status === "saved" && <span className="text-xs font-medium text-green-600">✓ Ingredient added</span>}
    </form>
  );
}
