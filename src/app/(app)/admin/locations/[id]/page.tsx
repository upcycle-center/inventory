import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { InventoryThreshold, LocationStaffRole, LocationStaffTier, Profile, StorageArea } from "@/lib/supabase/types";
import { STAFF_ROLES } from "@/lib/staffRoles";
import { sortStorageAreas } from "@/lib/storageAreas";
import { eachEquivalent, getLocationCountLines, latestByProductId } from "@/lib/onHand";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductThumbnail } from "@/components/ProductThumbnail";
import { toggleLocationActive } from "../actions";
import {
  addStaffRole,
  addStaffTier,
  postMonthEndPhysicalCount,
  removeStaffRole,
  removeStaffTier,
  updateBackupLead,
  updateDefaultLead,
  updateLocation,
  upsertThreshold,
} from "./actions";
import { DeleteLocationButton } from "./DeleteLocationButton";

function fmtQty(each: number | null | undefined, cases: number | null | undefined) {
  if (each == null && cases == null) return null;
  const parts = [];
  if (each != null) parts.push(`${each} EA`);
  if (cases != null) parts.push(`${cases} CS`);
  return parts.join(", ");
}

export default async function LocationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: location }, { data: staffRoles }, { data: staffTiers }, { data: locationProducts }, { data: users }, { data: thresholds }] =
    await Promise.all([
      supabase.from("locations").select("*").eq("id", params.id).single(),
      supabase.from("location_staff_roles").select("*").eq("location_id", params.id).order("sort_order"),
      supabase.from("location_staff_tiers").select("*").eq("location_id", params.id).order("min_attendance"),
      supabase
        .from("location_products")
        .select("product_id, product:products(id, sku, description, photo_url, active, case_size), storage_area:storage_areas(id, code, name)")
        .eq("location_id", params.id),
      supabase.from("profiles").select("*").order("name"),
      supabase.from("inventory_thresholds").select("*").eq("location_id", params.id),
    ]);

  if (!location) notFound();

  const roles = (staffRoles as LocationStaffRole[] | null) ?? [];
  const tiers = (staffTiers as LocationStaffTier[] | null) ?? [];
  const profileList = (users as Profile[] | null) ?? [];
  const thresholdByProductId = new Map(
    ((thresholds as InventoryThreshold[] | null) ?? []).map((t) => [t.product_id, t])
  );

  // On-Hand: the most recently counted qty (each/cases, no conversion
  // between them) per product at this location, from any event's count.
  const countLines = await getLocationCountLines(supabase, params.id);
  const onHandByProductId = latestByProductId(countLines);

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

  // moSTART / moEND: the calculated side is derived live from the same
  // count-line data as On-Hand, just scoped to a specific month. The
  // physical side is whatever's been posted to location_product_month_end
  // — once posted, it's authoritative for that month and what next
  // month's moSTART carries forward from.
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const prevMonthDate = new Date(currentYear, currentMonth - 2, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth() + 1;

  function calculatedForMonth(productId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 1).toISOString();
    let latest: any = null;
    for (const line of (countLines as any[]) ?? []) {
      if (line.product_id !== productId) continue;
      if (line.counted_at < start || line.counted_at >= end) continue;
      if (!latest || line.counted_at > latest.counted_at) latest = line;
    }
    return latest as { qty_each: number | null; qty_cases: number | null } | null;
  }

  const { data: monthEndRows } = await supabase
    .from("location_product_month_end")
    .select("*")
    .eq("location_id", params.id);

  const monthEndByProductMonth = new Map<string, { physical_qty_each: number | null; physical_qty_cases: number | null }>();
  for (const row of (monthEndRows as any[]) ?? []) {
    monthEndByProductMonth.set(`${row.product_id}:${row.year}-${row.month}`, row);
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
        <Link
          href={`/api/count-sheet/pdf?location=${location.id}`}
          className="w-fit rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          PDF Count Sheet
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
        Positions needed to run this location.
        {location.type === "stand" && (
          <> Stand Lead is a default role for Stand locations and always shows first below.</>
        )}
      </p>

      <ActionForm
        action={updateDefaultLead}
        savedLabel="Default Lead saved"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="id" value={location.id} />
        <div>
          <label className="mb-1 block text-xs text-gray-500">Default Lead</label>
          <select name="default_lead_user_id" defaultValue={location.default_lead_user_id ?? ""} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">— Unassigned —</option>
            {profileList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Save
        </button>
        <p className="w-full text-xs text-gray-400">
          Pre-fills the Lead dropdown on Event Details for this location when an event doesn&apos;t
          have its own assignment yet.
        </p>
      </ActionForm>

      <ActionForm
        action={updateBackupLead}
        savedLabel="Backup Lead saved"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="id" value={location.id} />
        <div>
          <label className="mb-1 block text-xs text-gray-500">Backup Lead</label>
          <select name="backup_lead_user_id" defaultValue={location.backup_lead_user_id ?? ""} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">— Unassigned —</option>
            {profileList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Save
        </button>
        <p className="w-full text-xs text-gray-400">
          Can open and submit counts for this stand at any event, without needing a separate
          per-event assignment — covers for the assigned Lead when needed.
        </p>
      </ActionForm>

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
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Add role
        </button>
      </ActionForm>

      <ul className="mb-8 space-y-1">
        {location.type === "stand" && (
          <li className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
            <span>
              (1) Stand Lead
              <span className="ml-2 text-xs text-gray-400">default for Stand locations</span>
            </span>
          </li>
        )}
        {roles.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
            <span>
              ({r.base_count}) {r.role_name}
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
        carry a product from that product&apos;s own page. moEND shows the calculated value from
        the latest count sheet this month — post a physical count to lock in the real number and
        flag any discrepancy; moSTART carries forward from last month&apos;s posted (or
        calculated) moEND. Set a Threshold to flag low On-Hand (shown in red) and to include the
        item in the daily low-stock report. To flag something for restock, use the{" "}
        <Link href="/request" className="text-brand hover:underline">
          Request
        </Link>{" "}
        page — it shows up in the{" "}
        <Link href="/restock-requests" className="text-brand hover:underline">
          RequestQ
        </Link>{" "}
        queue the same way.
      </p>
      <div className="max-w-6xl overflow-x-auto">
        {productsByArea.map(({ area, products }) => (
          <div key={area.id} className="mb-6">
            <p className="mb-2 text-xs font-medium text-gray-500">{area.name}</p>
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="whitespace-nowrap pb-2 pr-3"></th>
                  <th className="whitespace-nowrap pb-2 pr-3">Product</th>
                  <th className="whitespace-nowrap pb-2 pr-3">moSTART</th>
                  <th className="whitespace-nowrap pb-2 pr-3">On-Hand</th>
                  <th className="whitespace-nowrap pb-2 pr-3">Waste</th>
                  <th className="whitespace-nowrap pb-2 pr-3">Threshold (EA)</th>
                  <th className="whitespace-nowrap pb-2 pr-3">moEND</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const onHand = onHandByProductId.get(p.id);
                  const waste = wasteByProductId.get(p.id);
                  const threshold = thresholdByProductId.get(p.id);
                  const isLow =
                    !!threshold &&
                    threshold.reorder_threshold > 0 &&
                    eachEquivalent(onHand?.qty_each, onHand?.qty_cases, p.case_size) <= threshold.reorder_threshold;

                  const physicalPrev = monthEndByProductMonth.get(`${p.id}:${prevYear}-${prevMonth}`);
                  const calcPrev = calculatedForMonth(p.id, prevYear, prevMonth);
                  const moStart = physicalPrev
                    ? fmtQty(physicalPrev.physical_qty_each, physicalPrev.physical_qty_cases)
                    : fmtQty(calcPrev?.qty_each, calcPrev?.qty_cases);

                  const physicalCurrent = monthEndByProductMonth.get(`${p.id}:${currentYear}-${currentMonth}`);
                  const calcCurrent = calculatedForMonth(p.id, currentYear, currentMonth);
                  const discrepancy =
                    physicalCurrent &&
                    calcCurrent &&
                    ((physicalCurrent.physical_qty_each ?? 0) !== (calcCurrent.qty_each ?? 0) ||
                      (physicalCurrent.physical_qty_cases ?? 0) !== (calcCurrent.qty_cases ?? 0));

                  return (
                    <tr key={p.id} className="border-t border-gray-100 bg-white align-top">
                      <td className="whitespace-nowrap py-2 pr-3">
                        <ProductThumbnail photoUrl={p.photo_url} alt={p.description} />
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3">
                        <Link href={`/admin/products/${p.id}`} className="text-brand hover:underline">
                          {p.description}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3">{moStart ?? <span className="text-gray-400">—</span>}</td>
                      <td className={`whitespace-nowrap py-2 pr-3 ${isLow ? "font-medium text-red-600" : ""}`}>
                        {onHand ? fmtQty(onHand.qty_each, onHand.qty_cases) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3">{waste ? waste : <span className="text-gray-400">—</span>}</td>
                      <td className="whitespace-nowrap py-2 pr-3">
                        <ActionForm action={upsertThreshold} savedLabel="Saved" className="flex items-center gap-1">
                          <input type="hidden" name="location_id" value={location.id} />
                          <input type="hidden" name="product_id" value={p.id} />
                          <input
                            name="reorder_threshold"
                            type="number"
                            step="0.01"
                            min={0}
                            placeholder="—"
                            defaultValue={threshold?.reorder_threshold ?? ""}
                            className="w-16 rounded-md border border-gray-300 px-1.5 py-1 text-xs"
                          />
                          <button type="submit" className="rounded-md bg-brand px-2 py-1 text-xs text-white">
                            Save
                          </button>
                        </ActionForm>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3">
                        <p className="mb-1 text-xs text-gray-400">
                          Calc: {calcCurrent ? fmtQty(calcCurrent.qty_each, calcCurrent.qty_cases) : "—"}
                        </p>
                        <ActionForm action={postMonthEndPhysicalCount} savedLabel="Posted" className="flex items-center gap-1">
                          <input type="hidden" name="location_id" value={location.id} />
                          <input type="hidden" name="product_id" value={p.id} />
                          <input type="hidden" name="year" value={currentYear} />
                          <input type="hidden" name="month" value={currentMonth} />
                          <input
                            name="physical_qty_each"
                            type="number"
                            step="0.01"
                            placeholder="EA"
                            defaultValue={physicalCurrent?.physical_qty_each ?? ""}
                            className="w-14 rounded-md border border-gray-300 px-1.5 py-1 text-xs"
                          />
                          <input
                            name="physical_qty_cases"
                            type="number"
                            step="0.01"
                            placeholder="CS"
                            defaultValue={physicalCurrent?.physical_qty_cases ?? ""}
                            className="w-14 rounded-md border border-gray-300 px-1.5 py-1 text-xs"
                          />
                          <button type="submit" className="rounded-md bg-brand px-2 py-1 text-xs text-white">
                            Post
                          </button>
                        </ActionForm>
                        {discrepancy && <p className="mt-1 text-xs font-medium text-orange-600">Discrepancy vs. calc</p>}
                      </td>
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
