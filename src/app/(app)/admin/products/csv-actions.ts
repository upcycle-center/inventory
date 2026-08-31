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
  const costIdx = header.indexOf("unit_cost");
  const uomIdx = header.indexOf("unit_of_measure");
  const caseSizeIdx = header.indexOf("case_size");

  if (skuIdx === -1 || descIdx === -1) {
    return { message: "CSV must have at least 'sku' and 'description' columns." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const cols of rows.slice(1)) {
    const sku = cols[skuIdx]?.trim();
    const description = cols[descIdx]?.trim();
    if (!sku || !description) {
      skipped++;
      continue;
    }

    const upc = upcIdx !== -1 && cols[upcIdx]?.trim() ? cols[upcIdx].trim() : null;
    const unitCost = costIdx !== -1 && cols[costIdx]?.trim() ? Number(cols[costIdx]) : null;
    const unitOfMeasure = uomIdx !== -1 && cols[uomIdx]?.trim() ? cols[uomIdx].trim() : "each";
    const caseSize = caseSizeIdx !== -1 && cols[caseSizeIdx]?.trim() ? Number(cols[caseSizeIdx]) : null;

    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("sku", sku)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("products")
        .update({
          description,
          upc,
          supplier_id: supplierId,
          unit_cost: unitCost,
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
          unit_cost: unitCost,
          unit_of_measure: unitOfMeasure,
          case_size: caseSize,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();

      if (product) {
        const barcodes = [{ product_id: product.id, barcode: sku }];
        if (upc) barcodes.push({ product_id: product.id, barcode: upc });
        await supabase.from("product_barcodes").insert(barcodes);
      }
      created++;
    }
  }

  revalidatePath("/admin/products");
  return { message: `Done: ${created} created, ${updated} updated, ${skipped} skipped.` };
}
