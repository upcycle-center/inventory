import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { updateCategory } from "../actions";
import { DeleteCategoryButton } from "../DeleteCategoryButton";

export default async function CategoryDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: category } = await supabase.from("product_categories").select("*").eq("id", params.id).single();
  if (!category) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Categories", href: "/admin/categories" }, { label: category.name }]} />
      <h1 className="mb-6 text-lg font-semibold">Edit category</h1>

      <ActionForm
        id="edit-category-form"
        action={updateCategory}
        savedLabel="Category saved"
        className="grid max-w-md gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="id" value={category.id} />
        <label className="text-sm text-gray-600">
          Name
          <input name="name" defaultValue={category.name} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          GL Code
          <input name="gl_code" defaultValue={category.gl_code ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" name="is_pour_based" defaultChecked={category.is_pour_based} className="h-4 w-4" />
          Pour-based (liquor/wine — TOT Retail projects value off pours per bottle)
        </label>
      </ActionForm>

      <div className="mt-3 flex items-center gap-3">
        <button type="submit" form="edit-category-form" className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          Save
        </button>
        <DeleteCategoryButton categoryId={category.id} />
      </div>
    </div>
  );
}
