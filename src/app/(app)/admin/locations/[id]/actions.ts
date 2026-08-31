"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function assignProductToLocation(formData: FormData) {
  const supabase = createClient();
  const locationId = String(formData.get("location_id"));
  const productId = String(formData.get("product_id"));
  const storageAreaId = String(formData.get("storage_area_id"));
  if (!locationId || !productId || !storageAreaId) return;

  await supabase
    .from("location_products")
    .upsert(
      { location_id: locationId, product_id: productId, storage_area_id: storageAreaId },
      { onConflict: "location_id,product_id" }
    );

  revalidatePath(`/admin/locations/${locationId}`);
}

export async function removeProductFromLocation(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const locationId = String(formData.get("location_id"));
  await supabase.from("location_products").delete().eq("id", id);
  revalidatePath(`/admin/locations/${locationId}`);
}
