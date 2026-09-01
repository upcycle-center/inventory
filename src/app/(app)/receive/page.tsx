import { requireProfile } from "@/lib/auth";
import { ComingSoon } from "@/components/ComingSoon";

export default async function ReceivePage() {
  await requireProfile(["admin", "warehouse", "kitchen", "catering"]);
  return (
    <ComingSoon
      title="Receive"
      phase="Warehouse receiving flow (Main or Alcohol) ships in Phase 3."
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Receive" }]}
    />
  );
}
