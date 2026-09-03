"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  const costIdx = header.indexOf("case_cost");
  const salePriceIdx = header.indexOf("sale_price");
  const uomIdx = header.indexOf("unit_of_measure");
  const caseSizeIdx = header.indexOf("case_size");
  const locationIdx = header.indexOf("location");
  const storageAreaIdx = header.indexOf("storage_area");
  const thresholdIdx = header.indexOf("reorder_threshold");

  if (skuIdx === -1 || descIdx === -1) {
    return { message: "CSV must have at least 'sku' and 'description' columns." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: locations }, { data: storageAreas }] = await Promise.all([
    supabase.from("locations").select("id, name, yellow_dog_code").eq("active", true),
    supabase.from("storage_areas").select("id, code, name").eq("active", true),
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

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let locationsAssigned = 0;
  let locationsUnmatched = 0;

  for (const cols of rows.slice(1)) {
    const sku = cols[skuIdx]?.trim();
    const description = cols[descIdx]?.trim();
    if (!sku || !description) {
      skipped++;
      continue;
    }

    const upc = upcIdx !== -1 && cols[upcIdx]?.trim() ? cols[upcIdx].trim() : null;
    const caseCost = costIdx !== -1 && cols[costIdx]?.trim() ? Number(cols[costIdx]) : null;
    const salePrice = salePriceIdx !== -1 && cols[salePriceIdx]?.trim() ? Number(cols[salePriceIdx]) : null;
    const unitOfMeasure = uomIdx !== -1 && cols[uomIdx]?.trim() ? cols[uomIdx].trim() : "each";
    const caseSize = caseSizeIdx !== -1 && cols[caseSizeIdx]?.trim() ? Number(cols[caseSizeIdx]) : null;

    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("sku", sku)
      .maybeSingle();

    let productId = existing?.id as string | undefined;

    if (existing) {
      await supabase
        .from("products")
        .update({
          description,
          upc,
          supplier_id: supplierId,
          case_cost: caseCost,
          sale_price: salePrice,
          unit_of_measure: unitOfMeasure,
          case_size: caseSize,
        })
        .eq("id", existing.id);
      updated++;
    } else {
      const { data: product } = await supabase
        .from("products")
        .insert({
          sku,
          upc,
          description,
          supplier_id: supplierId,
          case_cost: caseCost,
          sale_price: salePrice,
          unit_of_measure: unitOfMeasure,
          case_size: caseSize,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();

      if (product) {
        productId = product.id;
        const barcodes = [{ product_id: product.id, barcode: sku }];
        if (upc) barcodes.push({ product_id: product.id, barcode: upc });
        await supabase.from("product_barcodes").insert(barcodes);
      }
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
  return {
    message: `Done: ${created} created, ${updated} updated, ${skipped} skipped. Locations: ${locationsAssigned} assigned${
      locationsUnmatched ? `, ${locationsUnmatched} unmatched (check location/storage_area names)` : ""
    }.`,
  };
}
