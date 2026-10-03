import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Recipe } from "@/lib/supabase/types";
import { getDraft } from "@/lib/actionDrafts";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RecipeRequestForm } from "./RecipeRequestForm";

export default async function RequestRecipePage() {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  const supabase = createClient();

  const [{ data: locations }, { data: recipes }, draft] = await Promise.all([
    supabase.from("locations").select("*").eq("active", true).order("name"),
    supabase.from("recipes").select("*").eq("active", true).order("name"),
    getDraft(supabase, profile.id, "recipe_request"),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Recipe Request" }]} />
      <h1 className="mb-2 text-lg font-semibold">Request Recipes</h1>
      <p className="mb-6 text-sm text-gray-500">
        Line up every recipe needed for an event, save it for later while you check stock, then post
        the whole batch at once — it lands in the RequestQ with each recipe&apos;s scaled ingredient
        pick list for Warehouse to fulfill.
      </p>

      {!(recipes as Recipe[] | null)?.length ? (
        <p className="text-sm text-gray-500">No recipes are set up yet — add one under Admin &gt; Catalog &gt; Recipes.</p>
      ) : (
        <RecipeRequestForm locations={locations ?? []} recipes={(recipes as Recipe[]) ?? []} initialValues={draft} />
      )}
    </div>
  );
}
