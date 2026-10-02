// Vercel runs in UTC, so `new Date().toISOString()` rolls over to the next
// day hours before it actually is that day on the East Coast. Use this
// wherever a report/email needs "today" to mean Eastern time, not UTC.
export function easternDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// Eastern date+time for confirmation emails/PDFs/"last updated" lines,
// in a single consistent yyyy-mm-dd hh:mm (24-hour) format app-wide, with
// the correct EST/EDT abbreviation for that date (America/New_York
// observes DST, so this is never hardcoded).
export function easternDateTimeString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${easternDateString(date)} ${hour}:${get("minute")} ${get("timeZoneName")}`;
}
