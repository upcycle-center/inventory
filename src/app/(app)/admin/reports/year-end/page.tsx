import { requireProfile } from "@/lib/auth";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export default async function YearEndReportPage() {
  await requireProfile(["admin"]);
  return (
    <ComingSoonPage
      breadcrumbLabel="Year End"
      title="Year End Report"
      description="A full-year rollup of inventory, retail, waste/comps, and staffing across every location. Not built yet."
    />
  );
}
