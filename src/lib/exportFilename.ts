// Shared naming convention for exported files: yyyy-mm-dd-BWP-<Report Name>-hhmm
// e.g. 2026-09-02-BWP-Inventory-Value-1432 — the server runs in UTC (Vercel),
// so date/time parts are read out in Eastern time rather than server-local.
export function exportFilename(reportName: string, ext: string, date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;

  const datePart = `${get("year")}-${get("month")}-${get("day")}`;
  const timePart = `${get("hour") === "24" ? "00" : get("hour")}${get("minute")}`;
  return `${datePart}-BWP-${reportName}-${timePart}.${ext}`;
}
