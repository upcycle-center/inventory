import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getDraft } from "@/lib/actionDrafts";
import { RequestForm } from "./RequestForm";

export default async function RequestPage() {
  const profile = await requireProfile(["admin", "warehouse", "kitchen", "catering"]);
  const supabase = createClient();

  const [{ data: products }, { data: locations }, draft] = await Promise.all([
    supabase.from("products").select("*").eq("active", true).order("sku"),
    supabase.from("locations").select("*").eq("active", true).order("name"),
    getDraft(supabase, profile.id, "request"),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Request" }]} />
      <h1 className="mb-2 text-lg font-semibold">Request Restock</h1>
      <p className="mb-6 text-sm text-gray-500">
        Flag a product at a location as needing restock — lands in the RequestQ for Warehouse/Admin to
        fulfill.
      </p>
      <RequestForm products={products ?? []} locations={locations ?? []} initialValues={draft} />
    </div>
  );
}
