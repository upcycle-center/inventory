import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LocationStaffRole, LocationStaffTier, StorageArea } from "@/lib/supabase/types";
import { STAFF_ROLES } from "@/lib/staffRoles";
import { sortStorageAreas } from "@/lib/storageAreas";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductThumbnail } from "@/components/ProductThumbnail";
import { toggleLocationActive } from "../actions";
import { addStaffRole, addStaffTier, removeStaffRole, removeStaffTier, updateLocation } from "./actions";
import { DeleteLocationButton } from "./DeleteLocationButton";

export default async function LocationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: location }, { data: staffRoles }, { data: staffTiers }, { data: locationProducts }] =
    await Promise.all([
      supabase.from("locations").select("*").eq("id", params.id).single(),
      supabase.from("location_staff_roles").select("*").eq("location_id", params.id).order("sort_order"),
      supabase.from("location_staff_tiers").select("*").eq("location_id", params.id).order("min_attendance"),
      supabase
        .from("location_products")
        .select("product_id, product:products(id, sku, description, photo_url, active), storage_area:storage_areas(id, code, name)")
        .eq("location_id", params.id),
    ]);

  if (!location) notFound();

  const roles = (staffRoles as LocationStaffRole[] | null) ?? [];
  const tiers = (staffTiers as LocationStaffTier[] | null) ?? [];

  // On-Hand: the most recently counted qty (each/cases, no conversion
  // between them) per product at this location, from any event's count.
  const { data: countsHere } = await supabase
    .from("location_counts")
    .select("id")
    .eq("location_id", params.id);
  const countIds = ((countsHere as { id: string }[] | null) ?? []).map((c) => c.id);

  const { data: countLines } = countIds.length
    ? await supabase
        .from("location_count_lines")
        .select("product_id, qty_each, qty_cases, counted_at")
        .in("location_count_id", countIds)
    : { data: [] as any[] };

  const onHandByProductId = new Map<string, { qty_each: number | null; qty_cases: number | null; counted_at: string }>();
  for (const line of (countLines as any[]) ?? []) {
    const existing = onHandByProductId.get(line.product_id);
    if (!existing || line.counted_at > existing.counted_at) {
      onHandByProductId.set(line.product_id, line);
    }
  }

  // Waste: month-to-date tally per product at this location.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { data: wasteRows } = await supabase
    .from("waste_records")
    .select("product_id, quantity")
    .eq("location_id", params.id)
    .gte("created_at", monthStart.toISOString());

  const wasteByProductId = new Map<string, number>();
  for (const row of (wasteRows as { product_id: string; quantity: number }[] | null) ?? []) {
    wasteByProductId.set(row.product_id, (wasteByProductId.get(row.product_id) ?? 0) + Number(row.quantity));
  }

  const areaMap = new Map<string, { area: StorageArea; products: any[] }>();
  for (const row of (locationProducts as any[]) ?? []) {
    if (!row.product?.active || !row.storage_area) continue;
    const entry = areaMap.get(row.storage_area.id) ?? { area: row.storage_area, products: [] as any[] };
    entry.products.push(row.product);
    areaMap.set(row.storage_area.id, entry);
  }
  const productsByArea = sortStorageAreas(Array.from(areaMap.values()).map((e) => e.area)).map(
    (area) => areaMap.get(area.id)!
  );

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Locations", href: "/admin/locations" },
          { label: location.name },
        ]}
      />
      <h1 className="mb-6 text-lg font-semibold">
        {location.yellow_dog_code && (
          <span className="mr-2 font-mono text-gray-400">{location.yellow_dog_code}</span>
        )}
        {location.name}
      </h1>

      <ActionForm
        id="edit-location-form"
        action={updateLocation}
        className="mb-3 grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <p className="text-sm font-medium">Location details</p>
        <input type="hidden" name="id" value={location.id} />
        <input name="name" defaultValue={location.name} required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select name="type" defaultValue={location.type} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="stand">Stand</option>
          <option value="kitchen">Kitchen</option>
          <option value="catering">Catering</option>
          <option value="warehouse">Warehouse</option>
        </select>
        <input
          name="description"
          defaultValue={location.description ?? ""}
          placeholder="Description (optional)"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <label className="text-sm text-gray-600">
          YDC (Yellow Dog Code)
          <input
            name="yellow_dog_code"
            defaultValue={location.yellow_dog_code ?? ""}
            placeholder="000"
            maxLength={3}
            pattern="\d{3}"
            className="mt-1 w-24 rounded-md border border-gray-300 px-3 py-2 text-center font-mono text-sm"
          />
        </label>
      </ActionForm>

      <div className="mb-8 flex items-center gap-3">
        <button type="submit" form="edit-location-form" className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          Save
        </button>
        <Link
          href={`/admin/locations/new?from=${location.id}`}
          className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Duplicate
        </Link>
        <ActionForm action={toggleLocationActive} className="contents" savedLabel={location.active ? "Deactivated" : "Reactivated"}>
          <input type="hidden" name="id" value={location.id} />
          <input type="hidden" name="active" value={String(location.active)} />
          <button type="submit" className="w-fit rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
            {location.active ? "Deactivate" : "Reactivate"}
          </button>
        </ActionForm>
        <DeleteLocationButton locationId={location.id} />
      </div>

      <p className="mb-3 text-sm font-medium">Base staffing needs</p>
      <p className="mb-3 text-sm text-gray-500">
        Positions needed to run this location. Set a required certification if the assigned
        Location Lead can cover that slot themselves (e.g. a Certified Bartender Lead covers the
        Bartender slot) — it&apos;s subtracted automatically on the event page.
      </p>

      <ActionForm
        action={addStaffRole}
        savedLabel="Role added"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="location_id" value={location.id} />
        <div>
          <label className="mb-1 block text-xs text-gray-500">Role</label>
          <select name="role_name" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Base count</label>
          <input name="base_count" type="number" min={0} step={1} defaultValue={1} className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Covered by Lead if certified</label>
          <input name="required_certification" placeholder="e.g. Certified Bartender" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Add role
        </button>
      </ActionForm>

      <ul className="mb-8 space-y-1">
        {roles.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
            <span>
              ({r.base_count}) {r.role_name}
              {r.required_certification && (
                <span className="ml-2 text-xs text-gray-400">covered by Lead w/ {r.required_certification}</span>
              )}
            </span>
            <form action={removeStaffRole}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="location_id" value={location.id} />
              <button type="submit" className="text-red-600 hover:underline">
                Remove
              </button>
            </form>
          </li>
        ))}
        {!roles.length && <li className="text-sm text-gray-400">No staffing roles set yet.</li>}
      </ul>

      <p className="mb-3 text-sm font-medium">Attendance tiers</p>
      <p className="mb-3 text-sm text-gray-500">
        Override a role&apos;s count for a given attendance range (e.g. fewer In Seat Servers for
        a smaller show). Leave max blank for &ldquo;and up&rdquo;.
      </p>

      <ActionForm
        action={addStaffTier}
        savedLabel="Tier added"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="location_id" value={location.id} />
        <div>
          <label className="mb-1 block text-xs text-gray-500">Role</label>
          <select name="role_name" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Min attendance</label>
          <input name="min_attendance" type="number" min={0} step={1} defaultValue={0} className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Max attendance</label>
          <input name="max_attendance" type="number" min={0} step={1} placeholder="and up" className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Count</label>
          <input name="count" type="number" min={0} step={1} required className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Add tier
        </button>
      </ActionForm>

      <ul className="mb-8 space-y-1">
        {tiers.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
            <span>
              {t.role_name}: {t.min_attendance}
              {t.max_attendance ? `–${t.max_attendance}` : "+"} attendance → ({t.count})
            </span>
            <form action={removeStaffTier}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="location_id" value={location.id} />
              <button type="submit" className="text-red-600 hover:underline">
                Remove
              </button>
            </form>
          </li>
        ))}
        {!tiers.length && <li className="text-sm text-gray-400">No attendance tiers set yet.</li>}
      </ul>

      <p className="mb-3 text-sm font-medium">Assigned Items</p>
      <p className="mb-3 text-sm text-gray-500">
        Only products checked for this location show up on its Count Sheet. Edit which locations
        carry a product from that product&apos;s own page. moSTART/moEND aren&apos;t wired up yet —
        see note below.
      </p>
      <div className="max-w-4xl overflow-x-auto">
        {productsByArea.map(({ area, products }) => (
          <div key={area.id} className="mb-6">
            <p className="mb-2 text-xs font-medium text-gray-500">{area.name}</p>
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="pb-2 pr-3"></th>
                  <th className="pb-2 pr-3">Product</th>
                  <th className="pb-2 pr-3">moSTART</th>
                  <th className="pb-2 pr-3">On-Hand</th>
                  <th className="pb-2 pr-3">Waste</th>
                  <th className="pb-2 pr-3">moEND</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const onHand = onHandByProductId.get(p.id);
                  const waste = wasteByProductId.get(p.id);
                  return (
                    <tr key={p.id} className="border-t border-gray-100 bg-white">
                      <td className="py-2 pr-3">
                        <ProductThumbnail photoUrl={p.photo_url} alt={p.description} />
                      </td>
                      <td className="py-2 pr-3">
                        <Link href={`/admin/products/${p.id}`} className="text-brand hover:underline">
                          {p.description}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-gray-400">—</td>
                      <td className="py-2 pr-3">
                        {onHand ? (
                          <>
                            {onHand.qty_each != null && `${onHand.qty_each} EA`}
                            {onHand.qty_each != null && onHand.qty_cases != null && ", "}
                            {onHand.qty_cases != null && `${onHand.qty_cases} CS`}
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">{waste ? waste : <span className="text-gray-400">—</span>}</td>
                      <td className="py-2 pr-3 text-gray-400">—</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
        {!productsByArea.length && <p className="text-sm text-gray-400">No products assigned yet.</p>}
      </div>
    </div>
  );
}
