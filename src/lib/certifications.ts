import type { UserCertification } from "@/lib/supabase/types";

// Green: checked and (no expiration or not yet expired). Orange: no record,
// or checked but past its expires_at.
export function certificationStatus(cert: UserCertification | undefined): "green" | "orange" {
  if (!cert) return "orange";
  if (!cert.expires_at) return "green";
  const today = new Date().toISOString().slice(0, 10);
  return cert.expires_at >= today ? "green" : "orange";
}
