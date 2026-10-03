import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LocationLabel } from "@/components/LocationLabel";
import { getRestockUnitByProductId } from "@/lib/restockUnit";
import {
  fulfillRestockRequest,
  deleteRestockRequest,
  denyRestockRequest,
  fulfillRecipeRequest,
  deleteRecipeRequest,
  reportRecipeRequestShortfall,
} from "./actions";
import { DENIAL_REASONS } from "@/lib/denialReasons";
import { recipeSizeLabel, pickListForSize } from "@/lib/recipeCost";
import { easternDateTimeString } from "@/lib/easternTime";

export default async function RestockRequestsPage() {
  const profile = await requireProfile();
  const isManager = ["admin", "warehouse"].includes(profile.role);
  const isAdmin = profile.role === "admin";
  const supabase = createClient();

  const [{ data: requests }, unitByProductId, { data: denials }, { data: fulfillments }] = await Promise.all([
    supabase
      .from("inventory_thresholds")
      .select(
        "id, product_id, reorder_threshold, reorder_qty, requested_at, product:products(id, sku, description), location:locations(id, name, yellow_dog_code), requested_by_profile:profiles(id, name)"
      )
      .not("requested_at", "is", null)
      .order("requested_at", { ascending: true }),
    getRestockUnitByProductId(supabase),
    isManager
      ? supabase
          .from("request_denials")
          .select(
            "id, reason_code, denied_at, product:products(id, sku, description), location:locations(id, name, yellow_dog_code), denied_by_profile:profiles(id, name)"
          )
          .order("denied_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as any[] }),
    isManager
      ? supabase
          .from("request_fulfillments")
          .select(
            "id, requested_qty, fulfilled_qty, fulfillment_pct, fulfilled_at, product:products(id, sku, description), location:locations(id, name, yellow_dog_code), fulfilled_by_profile:profiles(id, name)"
          )
          .order("fulfilled_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const rows = (requests as any[]) ?? [];
  const denialRows = (denials as any[]) ?? [];
  const fulfillmentRows = (fulfillments as any[]) ?? [];
  const reasonLabel = Object.fromEntries(DENIAL_REASONS.map((r) => [r.code, r.label]));

  const [{ data: recipeRequests }, { data: recipeFulfillments }] = await Promise.all([
    supabase
      .from("recipe_requests")
      .select(
        "id, size, quantity, note, status, requested_at, location:locations(id, name, yellow_dog_code), recipe:recipes(id, name), requested_by_profile:profiles(id, name)"
      )
      .in("status", ["pending", "partial"])
      .order("requested_at", { ascending: true }),
    isManager
      ? supabase
          .from("recipe_requests")
          .select(
            "id, size, quantity, fulfilled_at, location:locations(id, name, yellow_dog_code), recipe:recipes(id, name), fulfilled_by_profile:profiles(id, name)"
          )
          .eq("status", "fulfilled")
          .order("fulfilled_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const recipeRequestRows = (recipeRequests as any[]) ?? [];
  const recipeFulfillmentRows = (recipeFulfillments as any[]) ?? [];

  // One batch fetch of every ingredient needed across the pending queue's
  // recipes, so each row's pick list is just a scale+lookup rather than a
  // query per row.
  const recipeIds = Array.from(new Set(recipeRequestRows.map((r) => r.recipe?.id).filter(Boolean)));
  const { data: ingredientsRaw } = recipeIds.length
    ? await supabase
        .from("recipe_ingredients")
        .select("recipe_id, quantity_oz, product:products(id, description, supplier_id)")
        .in("recipe_id", recipeIds)
    : { data: [] as any[] };

  const ingredientsByRecipeId = new Map<string, { productId: string; description: string; quantityOz: number | null; supplierId: string | null }[]>();
  for (const row of (ingredientsRaw as any[]) ?? []) {
    if (!row.product) continue;
    const list = ingredientsByRecipeId.get(row.recipe_id) ?? [];
    list.push({
      productId: row.product.id,
      description: row.product.description,
      quantityOz: row.quantity_oz == null ? null : Number(row.quantity_oz),
      supplierId: row.product.supplier_id,
    });
    ingredientsByRecipeId.set(row.recipe_id, list);
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "RequestQ" }]} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">RequestQ</h1>
        {isManager && !!rows.length && (
          <Link
            href="/api/restock-requests/export"
            className="rounded-md bg-brand px-4 py-2 text-sm text-white"
          >
            Download CSV
          </Link>
        )}
      </div>
      <p className="mb-6 text-sm text-gray-500">
        {isManager
          ? "Items requested via the Request form or a location's Assigned Items table. Fulfill a request once it's been restocked — the qty field defaults to the full requested amount, edit it to post a partial drop — or deny it with a reason."
          : "Live view of everything currently queued for restock — Warehouse and Admin manage fulfillment."}
      </p>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2">Threshold</th>
              <th className="px-4 py-2">Requested Qty</th>
              <th className="px-4 py-2">Requested by</th>
              <th className="px-4 py-2">Requested</th>
              {isManager && <th className="px-4 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  <Link href={`/admin/locations/${r.location?.id}`} className="text-brand hover:underline">
                    {r.location && <LocationLabel location={r.location} />}
                  </Link>
                </td>
                <td className="px-4 py-2">{r.product?.description}</td>
                <td className="px-4 py-2 text-gray-500 capitalize">{unitByProductId.get(r.product_id) ?? "case"}</td>
                <td className="px-4 py-2 text-gray-500">{r.reorder_threshold}</td>
                <td className="px-4 py-2 text-gray-500">{r.reorder_qty || "—"}</td>
                <td className="px-4 py-2 text-gray-500">{r.requested_by_profile?.name ?? "—"}</td>
                <td className="px-4 py-2 text-gray-500">{new Date(r.requested_at).toLocaleDateString()}</td>
                {isManager && (
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <form action={fulfillRestockRequest} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={r.id} />
                        <input
                          type="number"
                          name="fulfilled_qty"
                          step="0.01"
                          min={0}
                          defaultValue={r.reorder_qty || ""}
                          title="Actual qty delivered in the drop -- defaults to the full requested amount, edit to post a partial adjustment"
                          className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-600"
                        />
                        <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white">
                          Fulfill
                        </button>
                      </form>
                      <form action={denyRestockRequest} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={r.id} />
                        <select
                          name="reason_code"
                          required
                          defaultValue=""
                          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-600"
                        >
                          <option value="" disabled>
                            Reason…
                          </option>
                          {DENIAL_REASONS.map((reason) => (
                            <option key={reason.code} value={reason.code}>
                              {reason.code} — {reason.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Deny
                        </button>
                      </form>
                      {isAdmin && (
                        <form action={deleteRestockRequest}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            Delete
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={isManager ? 8 : 7} className="px-4 py-6 text-center text-gray-400">
                  No open restock requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isManager && (
        <>
          <p className="mb-3 mt-8 text-sm font-medium">Recently fulfilled</p>
          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Requested Qty</th>
                  <th className="px-4 py-2">Fulfilled Qty</th>
                  <th className="px-4 py-2">Fulfillment</th>
                  <th className="px-4 py-2">Fulfilled by</th>
                  <th className="px-4 py-2">Fulfilled</th>
                </tr>
              </thead>
              <tbody>
                {fulfillmentRows.map((f) => (
                  <tr key={f.id} className="border-t border-gray-100">
                    <td className="px-4 py-2">{f.location && <LocationLabel location={f.location} />}</td>
                    <td className="px-4 py-2">{f.product?.description}</td>
                    <td className="px-4 py-2 text-gray-500">{f.requested_qty ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-500">{f.fulfilled_qty}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          f.fulfillment_pct >= 100 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {f.fulfillment_pct}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{f.fulfilled_by_profile?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-500">{new Date(f.fulfilled_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!fulfillmentRows.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                      No fulfilled requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mb-3 mt-8 text-sm font-medium">Recently denied</p>
          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Reason</th>
                  <th className="px-4 py-2">Denied by</th>
                  <th className="px-4 py-2">Denied</th>
                </tr>
              </thead>
              <tbody>
                {denialRows.map((d) => (
                  <tr key={d.id} className="border-t border-gray-100">
                    <td className="px-4 py-2">{d.location && <LocationLabel location={d.location} />}</td>
                    <td className="px-4 py-2">{d.product?.description}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {d.reason_code} — {reasonLabel[d.reason_code] ?? d.reason_code}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{d.denied_by_profile?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-500">{new Date(d.denied_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!denialRows.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                      No denied requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mb-3 mt-8 text-sm font-medium">Recipe Requests</p>
      <p className="mb-3 text-sm text-gray-500">
        Batches of a recipe requested for a location — the pick list is the scaled ingredient
        quantities for the size × quantity requested.
      </p>
      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Recipe</th>
              <th className="px-4 py-2">Pick List</th>
              <th className="px-4 py-2">Requested by</th>
              <th className="px-4 py-2">Requested</th>
              {isManager && <th className="px-4 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {recipeRequestRows.map((r) => {
              const ingredients = ingredientsByRecipeId.get(r.recipe?.id) ?? [];
              const pickList = pickListForSize(ingredients, r.size, r.quantity);
              const shortfallFormId = `shortfall-form-${r.id}`;
              return (
                <tr key={r.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.location && <LocationLabel location={r.location} />}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.recipe?.name}
                    {r.status === "partial" && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Partial</span>
                    )}
                    <span className="block text-xs text-gray-400">
                      {recipeSizeLabel(r.size)} × {r.quantity}
                    </span>
                    {r.note && <span className="block text-xs text-gray-400">{r.note}</span>}
                  </td>
                  <td className="px-4 py-2">
                    {isManager && <form id={shortfallFormId} action={reportRecipeRequestShortfall} />}
                    {pickList.map((ing) => (
                      <label key={ing.productId} className="flex items-center gap-1.5 whitespace-nowrap text-gray-500">
                        {isManager && (
                          <input type="checkbox" form={shortfallFormId} name="missing_product_id" value={ing.productId} className="h-3.5 w-3.5" />
                        )}
                        {ing.description}: {ing.quantityOz.toFixed(2)} oz
                        {ing.isTopOff && <span className="text-xs text-gray-400">(T/O)</span>}
                      </label>
                    ))}
                    {!pickList.length && <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-500">{r.requested_by_profile?.name ?? "—"}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-500">{easternDateTimeString(new Date(r.requested_at))}</td>
                  {isManager && (
                    <td className="px-4 py-2 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex justify-end items-center gap-2">
                          <form action={fulfillRecipeRequest}>
                            <input type="hidden" name="id" value={r.id} />
                            <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white">
                              Fulfill
                            </button>
                          </form>
                          {isAdmin && (
                            <form action={deleteRecipeRequest}>
                              <input type="hidden" name="id" value={r.id} />
                              <button
                                type="submit"
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                              >
                                Delete
                              </button>
                            </form>
                          )}
                        </div>
                        <button
                          type="submit"
                          form={shortfallFormId}
                          name="id"
                          value={r.id}
                          className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                        >
                          Report Shortfall → PO
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {!recipeRequestRows.length && (
              <tr>
                <td colSpan={isManager ? 6 : 5} className="px-4 py-6 text-center text-gray-400">
                  No open recipe requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isManager && (
        <>
          <p className="mb-3 mt-8 text-sm font-medium">Recently fulfilled recipe requests</p>
          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Recipe</th>
                  <th className="px-4 py-2">Fulfilled by</th>
                  <th className="px-4 py-2">Fulfilled</th>
                </tr>
              </thead>
              <tbody>
                {recipeFulfillmentRows.map((f) => (
                  <tr key={f.id} className="border-t border-gray-100">
                    <td className="px-4 py-2">{f.location && <LocationLabel location={f.location} />}</td>
                    <td className="px-4 py-2">
                      {f.recipe?.name} — {recipeSizeLabel(f.size)} × {f.quantity}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{f.fulfilled_by_profile?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-500">{easternDateTimeString(new Date(f.fulfilled_at))}</td>
                  </tr>
                ))}
                {!recipeFulfillmentRows.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                      No fulfilled recipe requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
