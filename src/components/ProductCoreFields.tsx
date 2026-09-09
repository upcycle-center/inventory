"use client";

import { useState } from "react";
import { PRODUCT_TYPE_OPTIONS, type ProductTypeValue } from "@/lib/productType";
import type { ProductCategory, Supplier } from "@/lib/supabase/types";

// Retail Value isn't factored in at all for these types (Non-Chargeable --
// Mixers and Disposables have no retail value; Non-Chargeable -- Bottles
// uses Price per pour instead) -- grayed out so it's obvious the number
// on screen isn't doing anything, without discarding whatever's already
// stored there if the Type gets changed back later.
const RETAIL_VALUE_DISABLED_TYPES = new Set<ProductTypeValue>(["non_chargeable_bottle", "non_chargeable_mixer", "disposable"]);
const POUR_FIELDS_ACTIVE_TYPE: ProductTypeValue = "non_chargeable_bottle";

function DisableableNumberField({
  label,
  name,
  defaultValue,
  disabled,
  placeholder,
  disabledTitle,
}: {
  label: string;
  name: string;
  defaultValue: number | string | null | undefined;
  disabled: boolean;
  placeholder?: string;
  disabledTitle: string;
}) {
  return (
    <label className="text-sm text-gray-600">
      {label}
      {disabled && <input type="hidden" name={name} value={defaultValue ?? ""} />}
      <input
        type="number"
        step="0.01"
        min={0}
        name={disabled ? undefined : name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        title={disabled ? disabledTitle : undefined}
        className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
          disabled ? "border-gray-200 bg-gray-100 text-gray-400" : "border-gray-300"
        }`}
      />
    </label>
  );
}

export function ProductCoreFields({
  suppliers,
  categories,
  defaultProductType,
  defaultSupplierId,
  defaultCategoryId,
  defaultCaseCost,
  defaultSalePrice,
  defaultCaseSize,
  defaultUnitOfMeasure,
  defaultBottleSizeMl,
  defaultPourSizeOz,
  defaultPourPrice,
}: {
  suppliers: Supplier[];
  categories: ProductCategory[];
  defaultProductType: string;
  defaultSupplierId: string | null | undefined;
  defaultCategoryId: string | null | undefined;
  defaultCaseCost: number | string | null | undefined;
  defaultSalePrice: number | string | null | undefined;
  defaultCaseSize: number | string | null | undefined;
  defaultUnitOfMeasure: string | null | undefined;
  defaultBottleSizeMl: number | string | null | undefined;
  defaultPourSizeOz: number | string | null | undefined;
  defaultPourPrice: number | string | null | undefined;
}) {
  const [productType, setProductType] = useState(defaultProductType);
  const retailValueDisabled = RETAIL_VALUE_DISABLED_TYPES.has(productType as ProductTypeValue);
  const pourFieldsActive = productType === POUR_FIELDS_ACTIVE_TYPE;

  return (
    <>
      <label className="text-sm text-gray-600">
        Type
        <select
          name="product_type"
          value={productType}
          onChange={(e) => setProductType(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {PRODUCT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-gray-600">
        Supplier
        <select name="supplier_id" defaultValue={defaultSupplierId ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">No supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-gray-600">
        Category (drives GL Code)
        <select name="category_id" defaultValue={defaultCategoryId ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.gl_code ? ` (${c.gl_code})` : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-gray-600">
          Case cost
          <input name="case_cost" type="number" step="0.01" defaultValue={defaultCaseCost ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <DisableableNumberField
          label="Retail Value (each)"
          name="sale_price"
          defaultValue={defaultSalePrice}
          disabled={retailValueDisabled}
          disabledTitle="Not used for this Type -- Non-Chargeable and Disposable items don't factor into TOT Retail directly."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-gray-600">
          Case size (units per case)
          <input name="case_size" type="number" step="1" min={0} defaultValue={defaultCaseSize ?? ""} placeholder="e.g. 24" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          Unit of measure
          <select name="unit_of_measure" defaultValue={defaultUnitOfMeasure ?? "each"} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="each">Each</option>
            <option value="case">Case</option>
          </select>
        </label>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium">Pour details (Type: Non-Chargeable – Bottles only)</p>
        <p className="mb-3 text-sm text-gray-500">
          For liquor/wine: TOT Retail projects a bottle&apos;s value off pours instead of Retail Value.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <DisableableNumberField
            label="Bottle size (mL)"
            name="bottle_size_ml"
            defaultValue={defaultBottleSizeMl}
            disabled={!pourFieldsActive}
            placeholder="e.g. 750"
            disabledTitle="Only used for Type: Non-Chargeable – Bottles."
          />
          <DisableableNumberField
            label="Pour size (oz)"
            name="pour_size_oz"
            defaultValue={defaultPourSizeOz}
            disabled={!pourFieldsActive}
            placeholder="e.g. 1.5"
            disabledTitle="Only used for Type: Non-Chargeable – Bottles."
          />
          <DisableableNumberField
            label="Price per pour"
            name="pour_price"
            defaultValue={defaultPourPrice}
            disabled={!pourFieldsActive}
            disabledTitle="Only used for Type: Non-Chargeable – Bottles."
          />
        </div>
      </div>
    </>
  );
}
