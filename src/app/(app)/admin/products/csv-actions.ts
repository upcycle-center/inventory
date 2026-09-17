"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isProductTypeValue } from "@/lib/productType";
import { SUB_UNIT_LABEL } from "@/lib/subUnit";
import { logCostChange } from "@/lib/productCostLog";
import { logCsvEvent } from "@/lib/productCsvEvents";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

// A product can be assigned to multiple locations, so the CSV is one row
// per (product, location) pair -- repeat sku/description/etc. on a second
// row with a different location to assign the same product to more than
// one place. Rows with no location/storage_area just upsert the product.
export async function bulkUploadProducts(formData: FormData): Promise<{ message: string }> {
  const supabase = createClient();
  const supplierId = String(formData.get("supplier_id") || "") || null;
  const file = formData.get("csv");

  if (!(file instanceof File) || file.size === 0) {
    return { message: "Choose a CSV file first." };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { message: "CSV needs a header row plus at least one product row." };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const skuIdx = header.indexOf("sku");
  const upcIdx = header.indexOf("upc");
  const descIdx = header.indexOf("description");
  const brandIdx = header.indexOf("brand");
  const productTypeIdx = header.indexOf("product_type");
  const categoryIdx = header.indexOf("category");
  const supplierIdx = header.indexOf("supplier");
  const costIdx = header.indexOf("case_cost");
  const salePriceIdx = header.indexOf("sale_price");
  const uomIdx = header.indexOf("unit_of_measure");
  const caseSizeIdx = header.indexOf("case_size");
  const bottleSizeIdx = header.indexOf("bottle_size_ml");
  const pourSizeIdx = header.indexOf("pour_size_oz");
  const pourPriceIdx = header.indexOf("pour_price");
  const middleUnitLabelIdx = header.indexOf("middle_unit_label");
  const middleUnitSizeIdx = header.indexOf("middle_unit_size");
  const eachCountableIdx = header.indexOf("each_countable");
  const posSquareIdx = header.indexOf("pos_square");
  const activeIdx = header.indexOf("active");
  const photoUrlIdx = header.indexOf("photo_url");
  const locationIdx = header.indexOf("location");
  const storageAreaIdx = header.indexOf("storage_area");
  const thresholdIdx = header.indexOf("reorder_threshold");

  if (skuIdx === -1 || descIdx === -1) {
    return { message: "CSV must have at least 'sku' and 'description' columns." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: locations }, { data: storageAreas }, { data: categories }, { data: suppliers }] = await Promise.all([
    supabase.from("locations").select("id, name, yellow_dog_code").eq("active", true),
    supabase.from("storage_areas").select("id, code, name").eq("active", true),
    supabase.from("product_categories").select("id, name, gl_code"),
    supabase.from("suppliers").select("id, name"),
  ]);

  const locationByKey = new Map<string, string>();
  for (const l of (locations as { id: string; name: string; yellow_dog_code: string | null }[] | null) ?? []) {
    if (l.yellow_dog_code) locationByKey.set(l.yellow_dog_code.toLowerCase(), l.id);
    locationByKey.set(l.name.toLowerCase(), l.id);
  }
  const storageAreaByKey = new Map<string, string>();
  for (const a of (storageAreas as { id: string; code: string; name: string }[] | null) ?? []) {
    storageAreaByKey.set(a.code.toLowerCase(), a.id);
    storageAreaByKey.set(a.name.toLowerCase(), a.id);
  }
  const categoryByName = new Map<string, string>();
  const categoryGlCodeByName = new Map<string, string | null>();
  for (const c of (categories as { id: string; name: string; gl_code: string | null }[] | null) ?? []) {
    categoryByName.set(c.name.toLowerCase(), c.id);
    categoryGlCodeByName.set(c.name.toLowerCase(), c.gl_code);
  }
  const supplierByName = new Map<string, string>();
  for (const s of (suppliers as { id: string; name: string }[] | null) ?? []) {
    supplierByName.set(s.name.toLowerCase(), s.id);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let firstError: string | null = null;
  let locationsAssigned = 0;
  let locationsUnmatched = 0;
  let categoriesUnmatched = 0;
  let suppliersCreated = 0;
  let productTypesUnmatched = 0;

  for (const cols of rows.slice(1)) {
    const description = cols[descIdx]?.trim();
    if (!description) {
      skipped++;
      continue;
    }

    // Same "only touch when present" rule as category/supplier -- a routine
    // description-only refresh shouldn't silently wipe an existing UPC.
    const upcRaw = upcIdx !== -1 ? cols[upcIdx]?.trim() : undefined;
    const upc = upcRaw !== undefined ? upcRaw || null : undefined;
    const categoryRaw = categoryIdx !== -1 ? cols[categoryIdx]?.trim() : undefined;

    // Same auto-fill as the manual New Product form: GL Code + the last 6
    // UPC digits, when sku is left blank and both are available.
    let sku = cols[skuIdx]?.trim();
    if (!sku) {
      const glCode = categoryRaw ? categoryGlCodeByName.get(categoryRaw.toLowerCase()) : undefined;
      const digits = (upc ?? "").replace(/\D/g, "");
      if (glCode && digits.length >= 6) {
        sku = `${glCode}-${digits.slice(-6)}`;
      }
    }
    if (!sku) {
      skipped++;
      continue;
    }

    // Same "only touch when present" rule as category/supplier -- a routine
    // price refresh shouldn't silently wipe an existing Brand.
    const brandRaw = brandIdx !== -1 ? cols[brandIdx]?.trim() : undefined;
    const brand = brandRaw !== undefined ? brandRaw || null : undefined;
    // A pre-hosted image URL -- there's no file to attach in a CSV, so this
    // just points straight at an already-uploaded photo instead of going
    // through the manual form's Storage upload step.
    const photoUrlRaw = photoUrlIdx !== -1 ? cols[photoUrlIdx]?.trim() : undefined;
    const photoUrl = photoUrlRaw !== undefined ? photoUrlRaw || null : undefined;
    // Only set on update when the column is actually present -- otherwise
    // a re-upload without product_type (e.g. a routine cost refresh)
    // would silently flip an existing product back to Chargeable.
    const productTypeRaw = productTypeIdx !== -1 ? cols[productTypeIdx]?.trim().toLowerCase() : undefined;
    let productType: string | undefined;
    if (productTypeRaw) {
      productType = isProductTypeValue(productTypeRaw) ? productTypeRaw : undefined;
      if (!productType) productTypesUnmatched++;
    }
    let categoryId: string | null | undefined;
    if (categoryRaw !== undefined) {
      if (!categoryRaw) {
        categoryId = null;
      } else {
        categoryId = categoryByName.get(categoryRaw.toLowerCase());
        if (!categoryId) categoriesUnmatched++;
      }
    }
    // Per-row supplier (matched by name) takes over from the single
    // form-wide dropdown when a "supplier" column is present -- otherwise
    // that one dropdown value would get stamped onto every row, clobbering
    // whatever supplier each product already had on file. A name that
    // doesn't match an existing supplier gets created on the spot, flagged
    // needs_review so a typo doesn't silently become an unnoticed
    // duplicate -- supplierByName is updated immediately so repeat
    // mentions of the same new name later in the same CSV reuse it
    // instead of creating a second row.
    const supplierRaw = supplierIdx !== -1 ? cols[supplierIdx]?.trim() : undefined;
    let rowSupplierId: string | null | undefined;
    if (supplierRaw !== undefined) {
      if (!supplierRaw) {
        rowSupplierId = null;
      } else {
        const supplierKey = supplierRaw.toLowerCase();
        rowSupplierId = supplierByName.get(supplierKey);
        if (!rowSupplierId) {
          const { data: newSupplier } = await supabase
            .from("suppliers")
            .insert({ name: supplierRaw, needs_review: true })
            .select("id")
            .single();
          if (newSupplier) {
            rowSupplierId = newSupplier.id;
            supplierByName.set(supplierKey, newSupplier.id);
            suppliersCreated++;
          }
        }
      }
    }
    // Same "only touch when present" rule as Brand/Category -- a routine
    // Brand/Category-only refresh shouldn't silently wipe cost, price,
    // sizing, or unit_of_measure on products that already have them set.
    const caseCostRaw = costIdx !== -1 ? cols[costIdx]?.trim() : undefined;
    const caseCost = caseCostRaw !== undefined ? (caseCostRaw ? Number(caseCostRaw) : null) : undefined;
    const salePriceRaw = salePriceIdx !== -1 ? cols[salePriceIdx]?.trim() : undefined;
    const salePrice = salePriceRaw !== undefined ? (salePriceRaw ? Number(salePriceRaw) : null) : undefined;
    const uomRaw = uomIdx !== -1 ? cols[uomIdx]?.trim() : undefined;
    const unitOfMeasure = uomRaw !== undefined ? uomRaw || "each" : undefined;
    const caseSizeRaw = caseSizeIdx !== -1 ? cols[caseSizeIdx]?.trim() : undefined;
    const caseSize = caseSizeRaw !== undefined ? (caseSizeRaw ? Number(caseSizeRaw) : null) : undefined;
    const bottleSizeRaw = bottleSizeIdx !== -1 ? cols[bottleSizeIdx]?.trim() : undefined;
    const bottleSizeMl = bottleSizeRaw !== undefined ? (bottleSizeRaw ? Number(bottleSizeRaw) : null) : undefined;
    const pourSizeRaw = pourSizeIdx !== -1 ? cols[pourSizeIdx]?.trim() : undefined;
    const pourSizeOz = pourSizeRaw !== undefined ? (pourSizeRaw ? Number(pourSizeRaw) : null) : undefined;
    const pourPriceRaw = pourPriceIdx !== -1 ? cols[pourPriceIdx]?.trim() : undefined;
    const pourPrice = pourPriceRaw !== undefined ? (pourPriceRaw ? Number(pourPriceRaw) : null) : undefined;
    // Same "only touch when the column is present" rule as product_type --
    // a routine price refresh shouldn't silently drop a product from the
    // Square data map.
    const posSquareRaw = posSquareIdx !== -1 ? cols[posSquareIdx]?.trim().toLowerCase() : undefined;
    const posSquare = posSquareRaw !== undefined ? posSquareRaw === "yes" || posSquareRaw === "true" || posSquareRaw === "1" : undefined;
    // Same "only touch when present" rule -- a routine refresh shouldn't
    // silently reactivate/deactivate a product that wasn't meant to change.
    const activeRaw = activeIdx !== -1 ? cols[activeIdx]?.trim().toLowerCase() : undefined;
    const active = activeRaw !== undefined ? activeRaw === "yes" || activeRaw === "true" || activeRaw === "1" : undefined;
    // Same "only touch when present" rule -- omitting these on a routine
    // refresh shouldn't silently drop a product's Count counting tier.
    // Sub-Unit is a uniform unit ("Count") rather than a named container --
    // any non-blank value in the column just turns it on.
    const middleUnitLabelRaw = middleUnitLabelIdx !== -1 ? cols[middleUnitLabelIdx]?.trim() : undefined;
    const middleUnitLabel = middleUnitLabelRaw !== undefined ? (middleUnitLabelRaw ? SUB_UNIT_LABEL : null) : undefined;
    const middleUnitSizeRaw = middleUnitSizeIdx !== -1 ? cols[middleUnitSizeIdx]?.trim() : undefined;
    const middleUnitSize = middleUnitSizeRaw !== undefined ? (middleUnitSizeRaw ? Number(middleUnitSizeRaw) : null) : undefined;
    const eachCountableRaw = eachCountableIdx !== -1 ? cols[eachCountableIdx]?.trim().toLowerCase() : undefined;
    const eachCountable =
      eachCountableRaw !== undefined ? eachCountableRaw === "yes" || eachCountableRaw === "true" || eachCountableRaw === "1" : undefined;

    const { data: existing } = await supabase
      .from("products")
      .select("id, case_cost")
      .eq("sku", sku)
      .maybeSingle();

    let productId = existing?.id as string | undefined;

    if (existing) {
      const { error } = await supabase
        .from("products")
        .update({
          description,
          ...(upc !== undefined ? { upc } : {}),
          ...(brand !== undefined ? { brand } : {}),
          ...(photoUrl !== undefined ? { photo_url: photoUrl } : {}),
          ...(active !== undefined ? { active } : {}),
          ...(productType ? { product_type: productType } : {}),
          ...(categoryId !== undefined ? { category_id: categoryId } : {}),
          ...(supplierRaw !== undefined ? (rowSupplierId !== undefined ? { supplier_id: rowSupplierId } : {}) : { supplier_id: supplierId }),
          ...(caseCost !== undefined ? { case_cost: caseCost } : {}),
          ...(salePrice !== undefined ? { sale_price: salePrice } : {}),
          ...(unitOfMeasure !== undefined ? { unit_of_measure: unitOfMeasure } : {}),
          ...(caseSize !== undefined ? { case_size: caseSize } : {}),
          ...(bottleSizeMl !== undefined ? { bottle_size_ml: bottleSizeMl } : {}),
          ...(pourSizeOz !== undefined ? { pour_size_oz: pourSizeOz } : {}),
          ...(pourPrice !== undefined ? { pour_price: pourPrice } : {}),
          ...(middleUnitLabel !== undefined ? { middle_unit_label: middleUnitLabel } : {}),
          ...(middleUnitSize !== undefined ? { middle_unit_size: middleUnitSize } : {}),
          ...(eachCountable !== undefined ? { each_countable: eachCountable } : {}),
          ...(posSquare !== undefined ? { pos_square: posSquare } : {}),
        })
        .eq("id", existing.id);
      if (error) {
        failed++;
        firstError ??= `${sku}: ${error.message}`;
        continue;
      }
      if (caseCost !== undefined) {
        await logCostChange(supabase, {
          productId: existing.id,
          previousCost: existing.case_cost,
          newCost: caseCost,
          source: "csv_upload",
          changedBy: user?.id ?? null,
        });
      }
      productId = existing.id;
      updated++;
    } else {
      const { data: product, error } = await supabase
        .from("products")
        .insert({
          sku,
          upc: upc ?? null,
          description,
          brand: brand ?? null,
          photo_url: photoUrl ?? null,
          ...(active !== undefined ? { active } : {}),
          product_type: productType ?? "chargeable",
          category_id: categoryId ?? null,
          supplier_id: supplierRaw !== undefined ? rowSupplierId ?? null : supplierId,
          case_cost: caseCost ?? null,
          sale_price: salePrice ?? null,
          unit_of_measure: unitOfMeasure ?? "each",
          case_size: caseSize ?? null,
          bottle_size_ml: bottleSizeMl ?? null,
          pour_size_oz: pourSizeOz ?? null,
          pour_price: pourPrice ?? null,
          middle_unit_label: middleUnitLabel ?? null,
          middle_unit_size: middleUnitSize ?? null,
          each_countable: eachCountable ?? true,
          pos_square: posSquare ?? false,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();

      if (error || !product) {
        failed++;
        firstError ??= `${sku}: ${error?.message ?? "insert failed"}`;
        continue;
      }
      productId = product.id;
      const barcodes = [{ product_id: product.id, barcode: sku }];
      if (upc) barcodes.push({ product_id: product.id, barcode: upc });
      await supabase.from("product_barcodes").insert(barcodes);
      created++;
    }

    if (!productId) continue;

    const locationKey = locationIdx !== -1 ? cols[locationIdx]?.trim().toLowerCase() : "";
    const storageAreaKey = storageAreaIdx !== -1 ? cols[storageAreaIdx]?.trim().toLowerCase() : "";
    if (!locationKey && !storageAreaKey) continue;

    const locationId = locationKey ? locationByKey.get(locationKey) : undefined;
    const storageAreaId = storageAreaKey ? storageAreaByKey.get(storageAreaKey) : undefined;

    if (!locationId || !storageAreaId) {
      locationsUnmatched++;
      continue;
    }

    await supabase
      .from("location_products")
      .upsert({ location_id: locationId, product_id: productId, storage_area_id: storageAreaId }, { onConflict: "location_id,product_id" });
    locationsAssigned++;

    const thresholdRaw = thresholdIdx !== -1 ? cols[thresholdIdx]?.trim() : "";
    if (thresholdRaw) {
      await supabase
        .from("inventory_thresholds")
        .upsert(
          { location_id: locationId, product_id: productId, reorder_threshold: Number(thresholdRaw) },
          { onConflict: "product_id,location_id" }
        );
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/locations");
  revalidatePath("/admin/products/bulk-upload");

  const message = `Done: ${created} created, ${updated} updated, ${skipped} skipped${failed ? `, ${failed} failed` : ""}. Locations: ${locationsAssigned} assigned${
    locationsUnmatched ? `, ${locationsUnmatched} unmatched (check location/storage_area names)` : ""
  }.${categoriesUnmatched ? ` ${categoriesUnmatched} category name(s) didn't match — check Admin → Categories.` : ""}${
    suppliersCreated
      ? ` ${suppliersCreated} new supplier(s) auto-created and flagged for review — check Admin → Suppliers.`
      : ""
  }${
    productTypesUnmatched
      ? ` ${productTypesUnmatched} product_type value(s) weren't recognized (must be exactly chargeable, non_chargeable_bottle, non_chargeable_mixer, or disposable) — those rows' Type was left unchanged.`
      : ""
  }${failed ? ` First error: ${firstError}` : ""}`;

  // Keep a copy of exactly what was uploaded, so a later question about
  // "what did this run actually contain" can be answered without relying
  // on someone still having the original file.
  const storagePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: uploadStorageError } = await supabase.storage
    .from("product-csv-uploads")
    .upload(storagePath, file, { contentType: file.type || "text/csv", upsert: false });

  await logCsvEvent(supabase, {
    direction: "upload",
    kind: "bulk_upload",
    filename: file.name,
    storagePath: uploadStorageError ? null : storagePath,
    resultMessage: message,
    performedBy: user?.id ?? null,
  });

  return { message };
}
