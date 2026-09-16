export type CallOutReason = "call_out" | "no_show" | "other";

const REASON_LABELS: Record<CallOutReason, string> = {
  call_out: "Call-Out",
  no_show: "No-Show",
  other: "Adjustment",
};

// Abbreviated so a narrow mobile table stays readable without wrapping.
const REASON_SHORT_LABELS: Record<CallOutReason, string> = {
  call_out: "C/O",
  no_show: "N/S",
  other: "ADJ",
};

const REASON_BADGE_CLASS: Record<CallOutReason, string> = {
  call_out: "bg-amber-100 text-amber-700",
  no_show: "bg-red-100 text-red-700",
  other: "bg-gray-100 text-gray-600",
};

// Shared by the Event Detail page's Staffing Changes Log and the
// Workforce Attendance report's drill-downs, so a Call-Out/No-Show/
// Adjustment always reads the same way everywhere it shows up.
export function ReasonBadge({ type }: { type: CallOutReason }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REASON_BADGE_CLASS[type]}`}>
      <span className="sm:hidden">{REASON_SHORT_LABELS[type]}</span>
      <span className="hidden sm:inline">{REASON_LABELS[type]}</span>
    </span>
  );
}
