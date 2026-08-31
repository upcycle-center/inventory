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
  const supplierId = String(formData.get("supplier_id") || "") || null;
  const unitCostRaw = String(formData.get("unit_cost") || "").trim();
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
      supplier_id: supplierId,
      unit_cost: unitCostRaw ? Number(unitCostRaw) : null,
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
