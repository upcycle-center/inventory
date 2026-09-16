"use client";

import { useState } from "react";
import { PRODUCT_TYPE_OPTIONS, type ProductTypeValue } from "@/lib/productType";
import { SUB_UNIT_OPTIONS } from "@/lib/subUnit";
import { caseSizeInEach } from "@/lib/onHand";
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
  currency,
}: {
  label: string;
  name: string;
  defaultValue: number | string | null | undefined;
  disabled: boolean;
  placeholder?: string;
  disabledTitle: string;
  currency?: boolean;
}) {
  return (
    <label className="text-sm text-gray-600">
      {label}
      {disabled && <input type="hidden" name={name} value={defaultValue ?? ""} />}
      <div className="relative mt-1">
        {currency && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>}
        <input
          type="number"
          step="0.01"
          min={0}
          name={disabled ? undefined : name}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          disabled={disabled}
          title={disabled ? disabledTitle : undefined}
          className={`w-full rounded-md border py-2 pr-3 text-sm ${currency ? "pl-6" : "pl-3"} ${
            disabled ? "border-gray-200 bg-gray-100 text-gray-400" : "border-gray-300"
          }`}
        />
      </div>
    </label>
  );
}

export function ProductCoreFields({
  suppliers,
  categories,
  defaultProductType,
  defaultSupplierId,
  defaultBrand,
  defaultCategoryId,
  defaultCaseCost,
  defaultSalePrice,
  defaultCaseSize,
  defaultUnitOfMeasure,
  defaultBottleSizeMl,
  defaultPourSizeOz,
  defaultPourPrice,
  defaultMiddleUnitLabel,
  defaultMiddleUnitSize,
  defaultEachCountable,
  onCategoryChange,
}: {
  suppliers: Supplier[];
  categories: ProductCategory[];
  defaultProductType: string;
  defaultSupplierId: string | null | undefined;
  defaultBrand?: string | null;
  defaultCategoryId: string | null | undefined;
  defaultCaseCost: number | string | null | undefined;
  defaultSalePrice: number | string | null | undefined;
  defaultCaseSize: number | string | null | undefined;
  defaultUnitOfMeasure: string | null | undefined;
  defaultBottleSizeMl: number | string | null | undefined;
  defaultPourSizeOz: number | string | null | undefined;
  defaultPourPrice: number | string | null | undefined;
  defaultMiddleUnitLabel?: string | null;
  defaultMiddleUnitSize?: number | string | null;
  defaultEachCountable?: boolean;
  onCategoryChange?: (glCode: string | null) => void;
}) {
  const [productType, setProductType] = useState(defaultProductType);
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? "");
  const [middleUnitLabel, setMiddleUnitLabel] = useState(defaultMiddleUnitLabel ?? "");
  const [eachCountable, setEachCountable] = useState(defaultEachCountable ?? true);
  const [unitOfMeasure, setUnitOfMeasure] = useState(defaultUnitOfMeasure ?? "each");
  const [caseCost, setCaseCost] = useState(String(defaultCaseCost ?? ""));
  const [caseSize, setCaseSize] = useState(String(defaultCaseSize ?? ""));
  const [subUnitCount, setSubUnitCount] = useState(String(defaultMiddleUnitSize ?? ""));
  const retailValueDisabled = RETAIL_VALUE_DISABLED_TYPES.has(productType as ProductTypeValue);
  const pourFieldsActive = productType === POUR_FIELDS_ACTIVE_TYPE;

  // Cost (EA) is a live preview of the same math unitCosts() does
  // server-side -- Cost (CS) divided by the effective each-per-case, which
  // compounds through the Sub-Unit once one is set.
  const eachPerCase = caseSizeInEach(caseSize ? Number(caseSize) : null, middleUnitLabel.trim() ? Number(subUnitCount) || null : null);
  const costPerEach = eachPerCase ? (Number(caseCost) || 0) / eachPerCase : 0;

  // Unit of measure is just "which of this product's own counting units is
  // primary" -- offer only the ones that actually apply: Each (unless
  // turned off below), Case (always), and the product's own middle unit
  // (Sleeve, Pack, ...) once it has a name. If a prior selection no longer
  // applies (e.g. Each got unchecked), fall back to the first option that does.
  const unitOptions = [
    ...(eachCountable ? [{ value: "each", label: "Each" }] : []),
    { value: "case", label: "Case" },
    ...(middleUnitLabel.trim() ? [{ value: middleUnitLabel.trim(), label: middleUnitLabel.trim() }] : []),
  ];
  const safeUnitOfMeasure = unitOptions.some((o) => o.value === unitOfMeasure) ? unitOfMeasure : unitOptions[0]?.value ?? "case";

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
        Brand
        <input
          name="brand"
          defaultValue={defaultBrand ?? ""}
          placeholder="e.g. Coca-Cola"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-gray-600">
        Category
        <select
          name="category_id"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            onCategoryChange?.(categories.find((c) => c.id === e.target.value)?.gl_code ?? null);
          }}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
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
          Cost (CS)
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
            <input
              name="case_cost"
              type="number"
              step="0.01"
              value={caseCost}
              onChange={(e) => setCaseCost(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 pl-6 pr-3 text-sm"
            />
          </div>
        </label>
        <label className="text-sm text-gray-600">
          Cost (EA)
          <input
            type="text"
            disabled
            readOnly
            value={costPerEach ? `$${costPerEach.toFixed(2)}` : "—"}
            title="Calculated from Cost (CS) divided by the effective each-per-case."
            className="mt-1 w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-400"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DisableableNumberField
          label="Retail (EA)"
          name="sale_price"
          defaultValue={defaultSalePrice}
          disabled={retailValueDisabled}
          disabledTitle="Not used for this Type -- Non-Chargeable and Disposable items don't factor into TOT Retail directly."
          currency
        />
        <label className="text-sm text-gray-600">
          {middleUnitLabel.trim() ? `Case size (${middleUnitLabel.trim()}s per case)` : "Case size (each per case)"}
          <input
            name="case_size"
            type="number"
            step="1"
            min={0}
            value={caseSize}
            onChange={(e) => setCaseSize(e.target.value)}
            placeholder={middleUnitLabel.trim() ? "e.g. 20" : "e.g. 24"}
            title={
              middleUnitLabel.trim()
                ? `With a Sub-Unit set, Case size means ${middleUnitLabel.trim().toLowerCase()}s per case, not each per case.`
                : undefined
            }
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="text-sm text-gray-600">
        Unit of measure
        <select
          name="unit_of_measure"
          value={safeUnitOfMeasure}
          onChange={(e) => setUnitOfMeasure(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {unitOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div>
        <p className="mb-1 text-sm font-medium">Counting units</p>
        <p className="mb-3 text-sm text-gray-500">
          For an extra packaging tier between Case and Each — a Sleeve of cups, a Pack of napkins.
          Leave Sub-Unit unset for the standard Case/Each setup.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            Sub-Unit
            <select
              name="middle_unit_label"
              value={middleUnitLabel}
              onChange={(e) => setMiddleUnitLabel(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— None —</option>
              {SUB_UNIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-600">
            Sub-Unit Count
            <input
              name="middle_unit_size"
              type="number"
              step="1"
              min={0}
              value={subUnitCount}
              onChange={(e) => setSubUnitCount(e.target.value)}
              placeholder="e.g. 50"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            name="each_countable"
            checked={eachCountable}
            onChange={(e) => setEachCountable(e.target.checked)}
            className="h-4 w-4"
          />
          Include EACH count
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
