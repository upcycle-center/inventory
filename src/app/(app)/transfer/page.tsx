import { requireProfile } from "@/lib/auth";
import { ComingSoon } from "@/components/ComingSoon";

export default async function TransferPage() {
  await requireProfile(["admin", "warehouse", "kitchen", "catering"]);
  return (
    <ComingSoon
      title="Transfer"
      phase="Move stock between any two locations (Warehouse, Stand, Kitchen) ships in Phase 6."
    />
  );
}
