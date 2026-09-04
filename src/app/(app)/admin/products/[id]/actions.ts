"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProduct(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const sku = String(formData.get("sku") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!id || !sku || !description) return;

  const upc = String(formData.get("upc") || "").trim() || null;
  const productType = String(formData.get("product_type") || "sellable") === "consumable" ? "consumable" : "sellable";
  const supplierId = String(formData.get("supplier_id") || "") || null;
  const caseCostRaw = String(formData.get("case_cost") || "").trim();
  const salePriceRaw = String(formData.get("sale_price") || "").trim();
  const unitOfMeasure = String(formData.get("unit_of_measure") || "each").trim() || "each";
  const caseSizeRaw = String(formData.get("case_size") || "").trim();

  let photoUrl: string | undefined;
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

  await supabase
    .from("products")
    .update({
      sku,
      upc,
      description,
      product_type: productType,
      supplier_id: supplierId,
      case_cost: caseCostRaw ? Number(caseCostRaw) : null,
      sale_price: salePriceRaw ? Number(salePriceRaw) : null,
      unit_of_measure: unitOfMeasure,
      case_size: caseSizeRaw ? Number(caseSizeRaw) : null,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    })
    .eq("id", id);

  // Keep the auto-registered barcodes in sync: the SKU-based one always
  // stays, the UPC-based one (if any) is reset to match the current UPC.
  await supabase.from("product_barcodes").delete().eq("product_id", id).neq("barcode", sku);
  await supabase.from("product_barcodes").upsert(
    { product_id: id, barcode: sku },
    { onConflict: "barcode" }
  );
  if (upc) {
    await supabase.from("product_barcodes").upsert(
      { product_id: id, barcode: upc },
      { onConflict: "barcode" }
    );
  }

  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/admin/products");
}

// One combined form drives all locations at once: a location is "sold
// here" (shows on that location's count sheet) exactly when its checkbox
// is checked, which upserts a location_products row with the chosen
// storage area; unchecked removes the row.
export async function syncProductLocations(formData: FormData) {
  const supabase = createClient();
  const productId = String(formData.get("product_id"));
  if (!productId) return;

  const { data: locations } = await supabase.from("locations").select("id").eq("active", true);

  for (const loc of locations ?? []) {
    const sold = formData.get(`sold_${loc.id}`) === "on";
    const storageAreaId = String(formData.get(`area_${loc.id}`) || "");

    if (sold && storageAreaId) {
      await supabase.from("location_products").upsert(
        { location_id: loc.id, product_id: productId, storage_area_id: storageAreaId },
        { onConflict: "location_id,product_id" }
      );
    } else {
      await supabase
        .from("location_products")
        .delete()
        .eq("location_id", loc.id)
        .eq("product_id", productId);
    }
  }

  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteProduct(id: string): Promise<{ error: string } | void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    const message = error.message.toLowerCase().includes("foreign key")
      ? "Can't delete — this product has count, waste, or movement history. Deactivate it instead."
      : error.message;
    return { error: message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/inactive");
  redirect("/admin/products");
}
