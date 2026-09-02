import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ReturnForm } from "./ReturnForm";

export default async function ReturnPage() {
  await requireProfile(["admin", "warehouse", "kitchen", "catering"]);
  const supabase = createClient();

  const [{ data: products }, { data: locations }, { data: suppliers }] = await Promise.all([
    supabase.from("products").select("*").eq("active", true).order("sku"),
    supabase.from("locations").select("*").eq("active", true).order("name"),
    supabase.from("suppliers").select("*").order("name"),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Return" }]} />
      <h1 className="mb-2 text-lg font-semibold">Return to Supplier</h1>
      <p className="mb-6 text-sm text-gray-500">
        Log inventory being sent back to a supplier — wrong item, damaged, expired, or otherwise.
      </p>
      <ReturnForm products={products ?? []} locations={locations ?? []} suppliers={suppliers ?? []} />
    </div>
  );
}
