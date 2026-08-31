"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createProduct(formData: FormData) {
  const supabase = createClient();

  const sku = String(formData.get("sku") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!sku || !description) return;

  const upc = String(formData.get("upc") || "").trim() || null;
  const supplierId = String(formData.get("supplier_id") || "") || null;
  const unitCostRaw = String(formData.get("unit_cost") || "").trim();
  const unitOfMeasure = String(formData.get("unit_of_measure") || "each").trim() || "each";
  const caseSizeRaw = String(formData.get("case_size") || "").trim();

  let photoUrl: string | null = null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const ext = photo.name.split(".").pop() || "jpg";
    const path = `${sku.replace(/[^a-zA-Z0-9_-]/g, "_")}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("product-photos")
      .upload(path, photo, { contentType: photo.type, upsert: false });

    if (!uploadError) {
      const { data } = supabase.storage.from("product-photos").getPublicUrl(path);
      photoUrl = data.publicUrl;
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      sku,
      upc,
      description,
      supplier_id: supplierId,
      unit_cost: unitCostRaw ? Number(unitCostRaw) : null,
      unit_of_measure: unitOfMeasure,
      case_size: caseSizeRaw ? Number(caseSizeRaw) : null,
      photo_url: photoUrl,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (!error && product) {
    // Auto-generated internal barcode: the SKU itself, Code128-printable on
    // cheat sheets — no manufacturer UPC lookup needed. If a real UPC was
    // supplied too, register it as an additional scannable barcode so
    // warehouse receiving can eventually scan the actual delivered product.
    const barcodes = [{ product_id: product.id, barcode: sku }];
    if (upc) barcodes.push({ product_id: product.id, barcode: upc });
    await supabase.from("product_barcodes").insert(barcodes);
  }

  revalidatePath("/admin/products");
}

export async function toggleProductActive(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await supabase.from("products").update({ active: !active }).eq("id", id);
  revalidatePath("/admin/products");
}
