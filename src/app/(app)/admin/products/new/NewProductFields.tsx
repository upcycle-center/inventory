"use client";

import { useState } from "react";
import { ProductCoreFields } from "@/components/ProductCoreFields";
import type { ProductCategory, Supplier } from "@/lib/supabase/types";

// Auto-fills IC as "[GL Code]-[last 6 UPC digits]" once both the Category
// (GL Code) and a 6+ digit UPC are on the form -- stops the moment the
// user types into IC themselves, so it never fights a manual entry.
export function NewProductFields({
  suppliers,
  categories,
  defaultProductType,
  defaultDescription,
  defaultSupplierId,
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
}: {
  suppliers: Supplier[];
  categories: ProductCategory[];
  defaultProductType: string;
  defaultDescription?: string;
  defaultSupplierId?: string | null;
  defaultCategoryId?: string | null;
  defaultCaseCost?: number | string | null;
  defaultSalePrice?: number | string | null;
  defaultCaseSize?: number | string | null;
  defaultUnitOfMeasure?: string | null;
  defaultBottleSizeMl?: number | string | null;
  defaultPourSizeOz?: number | string | null;
  defaultPourPrice?: number | string | null;
  defaultMiddleUnitLabel?: string | null;
  defaultMiddleUnitSize?: number | string | null;
  defaultEachCountable?: boolean;
}) {
  const [sku, setSku] = useState("");
  const [skuTouched, setSkuTouched] = useState(false);
  const [upc, setUpc] = useState("");
  const [glCode, setGlCode] = useState<string | null>(
    categories.find((c) => c.id === defaultCategoryId)?.gl_code ?? null
  );

  function maybeAutoFillSku(nextGlCode: string | null, nextUpc: string) {
    if (skuTouched) return;
    const digits = nextUpc.replace(/\D/g, "");
    if (!nextGlCode || digits.length < 6) return;
    setSku(`${nextGlCode}-${digits.slice(-6)}`);
  }

  return (
    <>
      <label className="text-sm text-gray-600">
        IC (Internal Code)
        <input
          name="sku"
          value={sku}
          onChange={(e) => {
            setSkuTouched(true);
            setSku(e.target.value);
          }}
          required
          placeholder="Enter a new, unique code"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {!skuTouched && (
          <span className="mt-1 block text-xs text-gray-400">
            Auto-fills as GL Code-last 6 UPC digits once both are set — type here to set it yourself.
          </span>
        )}
      </label>
      <label className="text-sm text-gray-600">
        UPC (optional)
        <input
          name="upc"
          value={upc}
          onChange={(e) => {
            setUpc(e.target.value);
            maybeAutoFillSku(glCode, e.target.value);
          }}
          placeholder="UPC (optional, if known)"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-gray-600">
        Description
        <input
          name="description"
          defaultValue={defaultDescription ?? ""}
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <ProductCoreFields
        suppliers={suppliers}
        categories={categories}
        defaultProductType={defaultProductType}
        defaultSupplierId={defaultSupplierId}
        defaultCategoryId={defaultCategoryId}
        defaultCaseCost={defaultCaseCost}
        defaultSalePrice={defaultSalePrice}
        defaultCaseSize={defaultCaseSize}
        defaultUnitOfMeasure={defaultUnitOfMeasure}
        defaultBottleSizeMl={defaultBottleSizeMl}
        defaultPourSizeOz={defaultPourSizeOz}
        defaultPourPrice={defaultPourPrice}
        defaultMiddleUnitLabel={defaultMiddleUnitLabel}
        defaultMiddleUnitSize={defaultMiddleUnitSize}
        defaultEachCountable={defaultEachCountable}
        onCategoryChange={(nextGlCode) => {
          setGlCode(nextGlCode);
          maybeAutoFillSku(nextGlCode, upc);
        }}
      />
    </>
  );
}
