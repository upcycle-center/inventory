import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function BeoPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Catering" }, { label: "BEO" }]} />
      <h1 className="mb-2 text-lg font-semibold">BEO</h1>
      <p className="text-sm text-gray-500">Banquet Event Order invoicing — coming soon.</p>
    </div>
  );
}
