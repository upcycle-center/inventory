import { easternDateString } from "./easternTime";

// hhmm in Eastern time — the server runs in UTC (Vercel), so time parts are
// read out in Eastern time rather than server-local.
function easternHHMM(date: Date): string {
  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => timeParts.find((p) => p.type === type)!.value;
  return `${get("hour") === "24" ? "00" : get("hour")}${get("minute")}`;
}

// Shared naming convention for exported files: yyyy-mm-dd-BWP-<Report Name>-hhmm
// e.g. 2026-09-02-BWP-Inventory-Value-1432
export function exportFilename(reportName: string, ext: string, date: Date = new Date()): string {
  return `${easternDateString(date)}-BWP-${reportName}-${easternHHMM(date)}.${ext}`;
}

// Count Sheet PDFs get their own convention, event name leading so they
// sort/group by event when several are downloaded into the same folder:
// (Event Name) BWP-Count-Sheet-YD Code-Location-Name (hhmm).pdf
// A blank template (no event) just drops the leading "(Event Name) ".
export function countSheetFilename(
  {
    eventName,
    yellowDogCode,
    locationName,
  }: { eventName: string | null; yellowDogCode: string | null; locationName: string },
  date: Date = new Date()
): string {
  const safeEventName = eventName ? eventName.replace(/[\\/:*?"<>|]+/g, "-").trim() : null;
  const safeLocation = [yellowDogCode, locationName]
    .filter((part): part is string => !!part)
    .join("-")
    .replace(/[^a-zA-Z0-9-]+/g, "-");
  const eventPrefix = safeEventName ? `(${safeEventName}) ` : "";
  return `${eventPrefix}BWP-Count-Sheet-${safeLocation} (${easternHHMM(date)}).pdf`;
}
