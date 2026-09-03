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
