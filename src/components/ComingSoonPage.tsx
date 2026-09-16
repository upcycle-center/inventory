import { Breadcrumbs } from "@/components/Breadcrumbs";

export function ComingSoonPage({
  breadcrumbLabel,
  title,
  description,
}: {
  breadcrumbLabel: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: breadcrumbLabel }]} />
      <h1 className="mb-2 text-lg font-semibold">{title}</h1>
      <p className="mb-6 max-w-md text-sm text-gray-500">{description}</p>
      <div className="rounded-md border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-400">
        Coming soon.
      </div>
    </div>
  );
}
