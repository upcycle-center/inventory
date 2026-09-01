import { Breadcrumbs } from "@/components/Breadcrumbs";

export function ComingSoon({
  title,
  phase,
  breadcrumbs,
}: {
  title: string;
  phase: string;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <div>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <h1 className="mb-2 text-lg font-semibold">{title}</h1>
      <p className="text-sm text-gray-500">{phase}</p>
    </div>
  );
}
