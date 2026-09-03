"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createProduct(formData: FormData) {
  const supabase = createClient();

  const sku = String(formData.get("sku") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!sku || !description) return;

  const upc = String(formData.get("upc") || "").trim() || null;
  const supplierId = String(formData.get("supplier_id") || "") || null;
  const caseCostRaw = String(formData.get("case_cost") || "").trim();
  const salePriceRaw = String(formData.get("sale_price") || "").trim();
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
      case_cost: caseCostRaw ? Number(caseCostRaw) : null,
      sale_price: salePriceRaw ? Number(salePriceRaw) : null,
      unit_of_measure: unitOfMeasure,
      case_size: caseSizeRaw ? Number(caseSizeRaw) : null,
      photo_url: photoUrl,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !product) {
    // Most likely a duplicate IC or UPC — stay put rather than redirecting
    // away as if it succeeded.
    return;
  }

  // Auto-generated internal barcode: the SKU itself, Code128-printable on
  // cheat sheets — no manufacturer UPC lookup needed. If a real UPC was
  // supplied too, register it as an additional scannable barcode so
  // warehouse receiving can eventually scan the actual delivered product.
  const barcodes = [{ product_id: product.id, barcode: sku }];
  if (upc) barcodes.push({ product_id: product.id, barcode: upc });
  await supabase.from("product_barcodes").insert(barcodes);

  // Locations: same checkbox-per-location + storage area picker as the
  // edit page's Locations table, submitted in the same form -- when
  // duplicating a product it arrives pre-checked for wherever the source
  // product is stocked, so this is normally just a review/confirm step.
  const { data: locations } = await supabase.from("locations").select("id").eq("active", true);
  const locationProductRows = ((locations as { id: string }[] | null) ?? [])
    .filter((l) => formData.get(`sold_${l.id}`) === "on" && formData.get(`area_${l.id}`))
    .map((l) => ({
      location_id: l.id,
      product_id: product.id,
      storage_area_id: String(formData.get(`area_${l.id}`)),
    }));
  if (locationProductRows.length) {
    await supabase.from("location_products").insert(locationProductRows);
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function toggleProductActive(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await supabase.from("products").update({ active: !active }).eq("id", id);
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/inactive");
  revalidatePath(`/admin/products/${id}`);
}
