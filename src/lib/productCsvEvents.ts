import type { SupabaseClient } from "@supabase/supabase-js";

export async function logCsvEvent(
  supabase: SupabaseClient,
  params: {
    direction: "upload" | "download";
    kind: "bulk_upload" | "template" | "export";
    filename?: string | null;
    storagePath?: string | null;
    resultMessage?: string | null;
    performedBy: string | null;
  }
): Promise<void> {
  await supabase.from("product_csv_events").insert({
    direction: params.direction,
    kind: params.kind,
    filename: params.filename ?? null,
    storage_path: params.storagePath ?? null,
    result_message: params.resultMessage ?? null,
    performed_by: params.performedBy,
  });
}
