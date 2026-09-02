// Shared naming convention for exported files: yyyy-mm-dd-BWP-<Report Name>-hhmm
// e.g. 2026-09-02-BWP-Inventory-Value-1432
export function exportFilename(reportName: string, ext: string, date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timePart = `${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `${datePart}-BWP-${reportName}-${timePart}.${ext}`;
}
