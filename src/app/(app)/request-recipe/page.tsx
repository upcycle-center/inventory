import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Location, Recipe } from "@/lib/supabase/types";
import { RECIPE_SIZE_DEFS } from "@/lib/recipeCost";
import { locationDisplayName } from "@/lib/locationLabel";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { submitRecipeRequest } from "./actions";

export default async function RequestRecipePage() {
  await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  const supabase = createClient();

  const [{ data: locations }, { data: recipes }] = await Promise.all([
    supabase.from("locations").select("*").eq("active", true).order("name"),
    supabase.from("recipes").select("*").eq("active", true).order("name"),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Recipe Request" }]} />
      <h1 className="mb-2 text-lg font-semibold">Request a Recipe</h1>
      <p className="mb-6 text-sm text-gray-500">
        Order a batch of a recipe for a location instead of individual products — it lands in the
        RequestQ as its own line, with the scaled ingredient pick list, for Warehouse to fulfill.
      </p>

      {!(recipes as Recipe[] | null)?.length ? (
        <p className="text-sm text-gray-500">No recipes are set up yet — add one under Admin &gt; Catalog &gt; Recipes.</p>
      ) : (
        <ActionForm
          action={submitRecipeRequest}
          savedLabel="Request posted to the queue"
          resetOnSuccess
          className="max-w-xl grid gap-3 rounded-md border border-gray-200 bg-white p-4"
        >
          <label className="text-sm text-gray-600">
            Location
            <select name="location_id" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select a location…</option>
              {(locations as Location[] | null)?.map((l) => (
                <option key={l.id} value={l.id}>
                  {locationDisplayName(l)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-600">
            Recipe
            <select name="recipe_id" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select a recipe…</option>
              {(recipes as Recipe[] | null)?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-gray-600">
              Size
              <select name="size" required defaultValue="single" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                {RECIPE_SIZE_DEFS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-600">
              Quantity
              <input
                name="quantity"
                type="number"
                min={1}
                step={1}
                defaultValue={1}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="text-sm text-gray-600">
            Note (optional)
            <input name="note" placeholder="e.g. needed for the 7pm set" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <button type="submit" className="w-fit rounded-md bg-brand px-4 py-2 text-sm text-white">
            Post request
          </button>
        </ActionForm>
      )}
    </div>
  );
}
