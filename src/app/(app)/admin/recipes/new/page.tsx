import Link from "next/link";
import { createRecipe } from "../actions";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function NewRecipePage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Recipes", href: "/admin/recipes" }, { label: "New Recipe" }]} />
      <h1 className="mb-6 text-lg font-semibold">New recipe</h1>

      <ActionForm id="new-recipe-form" action={createRecipe} className="grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4">
        <input name="name" placeholder="Name (e.g. House Margarita)" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input name="description" placeholder="Description (optional)" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </ActionForm>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          form="new-recipe-form"
          className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Save
        </button>
        <Link href="/admin/recipes" className="w-fit rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">
          Cancel
        </Link>
      </div>
    </div>
  );
}
