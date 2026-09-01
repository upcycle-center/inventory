import { createClient } from "@/lib/supabase/server";
import type { Product, Location } from "@/lib/supabase/types";
import { upsertThreshold, deleteThreshold } from "./actions";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdminThresholdsPage() {
  const supabase = createClient();
  const [{ data: locations }, { data: products }, { data: thresholds }] = await Promise.all([
    supabase.from("locations").select("*").eq("active", true).order("type").order("name"),
    supabase.from("products").select("*").eq("active", true).order("description"),
    supabase
      .from("inventory_thresholds")
      .select("id, reorder_threshold, reorder_qty, product:products(id, sku, description), location:locations(id, name)")
      .order("updated_at", { ascending: false }),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Thresholds" }]} />
      <h1 className="mb-2 text-lg font-semibold">Restock Thresholds</h1>
      <p className="mb-6 text-sm text-gray-500">
        When a location&apos;s closing count falls at or below the threshold, it&apos;s flagged for restock.
      </p>

      <ActionForm
        action={upsertThreshold}
        savedLabel="Threshold saved"
        className="mb-8 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <div>
          <label className="mb-1 block text-xs text-gray-500">Location</label>
          <select name="location_id" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {(locations as Location[] | null)?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Product</label>
          <select name="product_id" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {(products as Product[] | null)?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.description} ({p.sku})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Reorder at or below</label>
          <input name="reorder_threshold" type="number" step="0.01" required defaultValue={0} className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Reorder quantity</label>
          <input name="reorder_qty" type="number" step="0.01" required defaultValue={0} className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Save
        </button>
      </ActionForm>

      <table className="w-full max-w-2xl text-left text-sm">
        <thead className="text-gray-500">
          <tr>
            <th className="pb-2">Location</th>
            <th className="pb-2">Product</th>
            <th className="pb-2">Threshold</th>
            <th className="pb-2">Reorder qty</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {(thresholds as any[] | null)?.map((t) => (
            <tr key={t.id} className="border-t border-gray-100">
              <td className="py-2">{t.location?.name}</td>
              <td className="py-2">{t.product?.description}</td>
              <td className="py-2">{t.reorder_threshold}</td>
              <td className="py-2">{t.reorder_qty}</td>
              <td className="py-2 text-right">
                <form action={deleteThreshold}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="text-red-600 hover:underline">
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {!thresholds?.length && (
            <tr>
              <td colSpan={5} className="py-4 text-gray-400">
                No thresholds set yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
