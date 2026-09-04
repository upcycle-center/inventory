import Link from "next/link";
import type { ViewKey } from "@/lib/permissions";
import type { ActionDraftType } from "@/lib/actionDrafts";

// Shared with every role's landing page (/operations, /warehouse,
// /catering, /kitchen, /stand) and the Dashboard overview -- one row of
// buttons for whichever actions that role is actually allowed, lit up when
// there's something waiting on the user (a pending RequestQ item, a saved
// draft).
const ACTIVE_BUTTON = "rounded-md px-4 py-2 text-sm font-medium text-white";
const IDLE_BUTTON = "rounded-md border border-gray-300 px-4 py-2 text-sm";

const BUTTONS: { viewKey: ViewKey; label: string; href: string; draftType?: ActionDraftType; activeColor?: string }[] = [
  { viewKey: "count", label: "Count", href: "/count" },
  { viewKey: "receive", label: "Receive", href: "/receive" },
  { viewKey: "restock_requests", label: "RequestQ", href: "/restock-requests" },
  { viewKey: "request", label: "Request", href: "/request", draftType: "request", activeColor: "bg-yellow-400" },
  { viewKey: "transfer", label: "Transfer", href: "/transfer", draftType: "transfer", activeColor: "bg-purple-600" },
  { viewKey: "return", label: "Return", href: "/return", draftType: "return", activeColor: "bg-fuchsia-600" },
  { viewKey: "recovery", label: "Recovery", href: "/recovery", draftType: "recovery", activeColor: "bg-orange-600" },
];

export function RoleActionButtons({
  allowedViews,
  pendingRequestCount = 0,
  draftTypes,
}: {
  allowedViews: Set<ViewKey>;
  pendingRequestCount?: number;
  draftTypes: Set<ActionDraftType>;
}) {
  const visible = BUTTONS.filter((b) => allowedViews.has(b.viewKey));
  if (!visible.length) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {visible.map((b) => {
        const isRequestQ = b.viewKey === "restock_requests";
        const isActive = isRequestQ ? pendingRequestCount > 0 : b.draftType ? draftTypes.has(b.draftType) : false;
        const activeColor = isRequestQ ? "bg-orange-500" : b.activeColor;
        return (
          <Link key={b.viewKey} href={b.href} className={isActive ? `${ACTIVE_BUTTON} ${activeColor}` : IDLE_BUTTON}>
            {b.label}
            {isRequestQ && pendingRequestCount ? ` (${pendingRequestCount})` : ""}
          </Link>
        );
      })}
    </div>
  );
}
