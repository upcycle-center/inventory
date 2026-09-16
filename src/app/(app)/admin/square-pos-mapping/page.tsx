import { requireProfile } from "@/lib/auth";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export default async function SquarePosMappingPage() {
  await requireProfile(["admin"]);
  return (
    <ComingSoonPage
      breadcrumbLabel="Square POS"
      title="Square POS Mapping"
      description="Map Square POS items to catalog Products, the same way Yellow Dog CSV Mapping works today. Not built yet."
    />
  );
}
