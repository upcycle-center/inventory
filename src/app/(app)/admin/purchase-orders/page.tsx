import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LocationLabel } from "@/components/LocationLabel";
import { updatePurchaseOrderStatus, removePurchaseOrderItem } from "./actions";

const NEXT_STATUS: Record<string, { value: string; label: string } | null> = {
  requested: { value: "placed", label: "Mark Placed" },
  placed: { value: "received", label: "Mark Received" },
  received: null,
};

export default async function PurchaseOrdersPage() {
  const profile = await requireProfile(["admin", "warehouse"]);
  const isAdmin = profile.role === "admin";
  const supabase = createClient();

  const { data: ordersRaw } = await supabase
    .from("purchase_orders")
    .select("id, status, notes, created_at, supplier:suppliers(id, name), location:locations(id, name, yellow_dog_code)")
    .in("status", ["requested", "placed", "received"])
    .order("created_at", { ascending: false });

  const orders = (ordersRaw as any[]) ?? [];
  const orderIds = orders.map((o) => o.id);

  const { data: itemsRaw } = orderIds.length
    ? await supabase
        .from("purchase_order_items")
        .select("id, purchase_order_id, quantity_oz, note, product:products(id, sku, description)")
        .in("purchase_order_id", orderIds)
        .order("created_at", { ascending: true })
    : { data: [] as any[] };

  const itemsByOrderId = new Map<string, any[]>();
  for (const item of (itemsRaw as any[]) ?? []) {
    const list = itemsByOrderId.get(item.purchase_order_id) ?? [];
    list.push(item);
    itemsByOrderId.set(item.purchase_order_id, list);
  }

  const sections: { status: string; title: string }[] = [
    { status: "requested", title: "PO Requests" },
    { status: "placed", title: "Placed" },
    { status: "received", title: "Received" },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Purchase Orders" }]} />
      <h1 className="mb-2 text-lg font-semibold">Purchase Orders</h1>
      <p className="mb-6 text-sm text-gray-500">
        A PO Request is an ingredient shortfall flagged from a Recipe Request&apos;s pick list — mark
        it Placed once it&apos;s actually sent to the supplier, then Received once it arrives.
      </p>

      {sections.map((section) => {
        const sectionOrders = orders.filter((o) => o.status === section.status);
        return (
          <div key={section.status} className="mb-8">
            <p className="mb-3 text-sm font-medium">{section.title}</p>
            {!sectionOrders.length && <p className="text-sm text-gray-400">None.</p>}
            <div className="space-y-3">
              {sectionOrders.map((o) => {
                const items = itemsByOrderId.get(o.id) ?? [];
                const next = NEXT_STATUS[o.status];
                return (
                  <div key={o.id} className="rounded-md border border-gray-200 bg-white p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-medium">{o.supplier?.name ?? "—"}</span>
                        <span className="ml-2 text-xs text-gray-400">
                          {o.location && <LocationLabel location={o.location} />} · {new Date(o.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {next && (
                          <form action={updatePurchaseOrderStatus}>
                            <input type="hidden" name="id" value={o.id} />
                            <input type="hidden" name="status" value={next.value} />
                            <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white">
                              {next.label}
                            </button>
                          </form>
                        )}
                        {isAdmin && o.status !== "canceled" && (
                          <form action={updatePurchaseOrderStatus}>
                            <input type="hidden" name="id" value={o.id} />
                            <input type="hidden" name="status" value="canceled" />
                            <button
                              type="submit"
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between text-sm">
                          <span>
                            {item.product?.description ?? "—"}
                            {item.quantity_oz != null && <span className="ml-2 text-gray-500">{Number(item.quantity_oz).toFixed(2)} oz</span>}
                            {item.note && <span className="ml-2 text-xs text-gray-400">{item.note}</span>}
                          </span>
                          {o.status === "requested" && (
                            <form action={removePurchaseOrderItem}>
                              <input type="hidden" name="id" value={item.id} />
                              <button type="submit" className="text-xs text-red-600 hover:underline">
                                Remove
                              </button>
                            </form>
                          )}
                        </li>
                      ))}
                      {!items.length && <li className="text-sm text-gray-400">No items on this PO.</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
