"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { DENIAL_REASONS } from "@/lib/denialReasons";
import { pickListForSize } from "@/lib/recipeCost";
import type { RecipeRequestSize } from "@/lib/supabase/types";

// Fulfilling logs the drop (request_fulfillments) with who/when and how
// much actually went out -- fulfilled_qty defaults to the full requested
// reorder_qty (a plain "Confirm"), or the fulfiller can post an adjusted
// number for a partial drop. fulfillment_pct is fixed at fulfillment time.
export async function fulfillRestockRequest(formData: FormData): Promise<void> {
  const profile = await requireProfile(["admin", "warehouse"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  if (!id) return;

  const { data: threshold } = await supabase
    .from("inventory_thresholds")
    .select("product_id, location_id, reorder_qty, requested_by, requested_at")
    .eq("id", id)
    .single();
  if (!threshold) return;

  const requestedQty = threshold.reorder_qty ?? 0;
  const adjustedRaw = String(formData.get("fulfilled_qty") || "").trim();
  const fulfilledQty = adjustedRaw ? Number(adjustedRaw) : requestedQty;
  if (!Number.isFinite(fulfilledQty) || fulfilledQty < 0) return;
  const fulfillmentPct = requestedQty > 0 ? Math.round((fulfilledQty / requestedQty) * 10000) / 100 : 100;

  await supabase.from("request_fulfillments").insert({
    product_id: threshold.product_id,
    location_id: threshold.location_id,
    requested_qty: requestedQty,
    fulfilled_qty: fulfilledQty,
    fulfillment_pct: fulfillmentPct,
    requested_by: threshold.requested_by,
    requested_at: threshold.requested_at,
    fulfilled_by: profile.id,
  });

  await supabase.from("inventory_thresholds").update({ requested_at: null, requested_by: null }).eq("id", id);

  revalidatePath("/restock-requests");
  revalidatePath("/dashboard");
}

// Denying keeps a reason on file (request_denials) instead of the request
// just silently vanishing from the queue -- the alternative to Delete for
// Warehouse, which doesn't get a no-reason-given removal option.
export async function denyRestockRequest(formData: FormData): Promise<void> {
  const profile = await requireProfile(["admin", "warehouse"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const reasonCode = String(formData.get("reason_code") || "");
  if (!id) return;
  if (!(DENIAL_REASONS as readonly { code: string }[]).some((r) => r.code === reasonCode)) return;

  const { data: threshold } = await supabase
    .from("inventory_thresholds")
    .select("product_id, location_id, reorder_threshold, requested_by, requested_at")
    .eq("id", id)
    .single();
  if (!threshold) return;

  await supabase.from("request_denials").insert({
    product_id: threshold.product_id,
    location_id: threshold.location_id,
    reorder_threshold: threshold.reorder_threshold,
    requested_by: threshold.requested_by,
    requested_at: threshold.requested_at,
    reason_code: reasonCode,
    denied_by: profile.id,
  });

  await supabase.from("inventory_thresholds").update({ requested_at: null, requested_by: null }).eq("id", id);

  revalidatePath("/restock-requests");
  revalidatePath("/dashboard");
}

// Admin-only: a true no-reason-given removal for a mistaken or duplicate
// entry. Warehouse uses Deny instead, which keeps a reason on file.
export async function deleteRestockRequest(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  if (!id) return;

  await supabase.from("inventory_thresholds").update({ requested_at: null, requested_by: null }).eq("id", id);

  revalidatePath("/restock-requests");
  revalidatePath("/dashboard");
}

export async function fulfillRecipeRequest(formData: FormData) {
  const profile = await requireProfile(["admin", "warehouse"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  if (!id) return;

  await supabase
    .from("recipe_requests")
    .update({ status: "fulfilled", fulfilled_by: profile.id, fulfilled_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/restock-requests");
  revalidatePath("/dashboard");
}

// Admin-only: same no-reason-given removal as deleteRestockRequest --
// there's no recipe-specific denial reason taxonomy, so Delete covers
// both "wrong entry" and "can't fulfill this".
export async function deleteRecipeRequest(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  if (!id) return;

  await supabase.from("recipe_requests").update({ status: "canceled" }).eq("id", id);

  revalidatePath("/restock-requests");
  revalidatePath("/dashboard");
}

// A Recipe Request's pick list came up short -- flag whichever
// ingredients (by checkbox) couldn't be pulled. Each one lands as a
// purchase_order_items row on a 'requested'-status PO for its own
// supplier (an existing open requested PO for that supplier+location is
// reused rather than spawning a new one every time), and the Recipe
// Request itself moves to 'partial' so it stays visible until the
// shortfall is received and someone completes it. Ingredients without a
// supplier on file are skipped -- there's nowhere to route that PO item.
export async function reportRecipeRequestShortfall(formData: FormData): Promise<void> {
  const profile = await requireProfile(["admin", "warehouse"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const missingProductIds = formData.getAll("missing_product_id").map(String);
  if (!id || !missingProductIds.length) return;

  const { data: request } = await supabase
    .from("recipe_requests")
    .select("id, location_id, recipe_id, size, quantity, recipe:recipes(name)")
    .eq("id", id)
    .single();
  if (!request) return;

  const { data: ingredientsRaw } = await supabase
    .from("recipe_ingredients")
    .select("product_id, quantity_oz, product:products(id, description, supplier_id)")
    .eq("recipe_id", request.recipe_id);

  const ingredients = ((ingredientsRaw as any[]) ?? [])
    .filter((row) => row.product)
    .map((row) => ({
      productId: row.product.id as string,
      description: row.product.description as string,
      quantityOz: row.quantity_oz == null ? null : Number(row.quantity_oz),
    }));
  const supplierIdByProductId = new Map<string, string | null>(
    ((ingredientsRaw as any[]) ?? []).filter((row) => row.product).map((row) => [row.product.id as string, row.product.supplier_id as string | null])
  );

  const pickList = pickListForSize(ingredients, request.size as RecipeRequestSize, request.quantity).map((i) => ({
    ...i,
    supplierId: supplierIdByProductId.get(i.productId) ?? null,
  }));
  const missing = pickList.filter((i) => missingProductIds.includes(i.productId));
  const routable = missing.filter((i) => i.supplierId);

  // Ingredients with no supplier on file are silently skipped -- there's
  // nowhere to route that PO item until one's set on the product.
  if (!routable.length) return;

  const recipeName = (request as any).recipe?.name ?? "Recipe";
  const poIdBySupplier = new Map<string, string>();

  for (const ing of routable) {
    let poId: string | undefined = poIdBySupplier.get(ing.supplierId!);
    if (!poId) {
      const { data: existing } = await supabase
        .from("purchase_orders")
        .select("id")
        .eq("supplier_id", ing.supplierId!)
        .eq("location_id", request.location_id)
        .eq("status", "requested")
        .maybeSingle();

      if (existing) {
        poId = existing.id as string;
      } else {
        const { data: created, error: createError } = await supabase
          .from("purchase_orders")
          .insert({ supplier_id: ing.supplierId!, location_id: request.location_id, status: "requested", created_by: profile.id })
          .select("id")
          .single();
        if (createError || !created) return;
        poId = created.id as string;
      }
      poIdBySupplier.set(ing.supplierId!, poId);
    }

    await supabase.from("purchase_order_items").insert({
      purchase_order_id: poId,
      product_id: ing.productId,
      quantity_oz: ing.quantityOz,
      note: `Short on ${recipeName} request`,
      recipe_request_id: id,
    });
  }

  await supabase.from("recipe_requests").update({ status: "partial" }).eq("id", id);

  revalidatePath("/restock-requests");
  revalidatePath("/admin/purchase-orders");
  revalidatePath("/dashboard");
}
