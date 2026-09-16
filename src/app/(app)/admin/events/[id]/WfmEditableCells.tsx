"use client";

import { useState } from "react";

type RoleCountCell = { roleName: string; count: number | null; note: string | null };

// The role count inputs, live Total, and Confirm/Reset controls for one
// unconfirmed WFM Shifts row -- a client component so Reset can force the
// inputs back to the suggested (tier-computed) counts, discarding any
// edits or last-confirmed values they were pre-filled with. Remounting an
// input with a new key is how an uncontrolled defaultValue gets replaced
// without needing per-keystroke controlled state.
export function WfmEditableCells({
  formId,
  roleCounts,
  previousCounts,
  recommended,
  confirmDisabled,
  isOpen,
}: {
  formId: string;
  roleCounts: RoleCountCell[];
  previousCounts: Record<string, number> | null;
  recommended: number;
  confirmDisabled: boolean;
  isOpen: boolean;
}) {
  const [resetCount, setResetCount] = useState(0);

  return (
    <>
      {roleCounts.map(({ roleName, count, note }) => (
        <td key={roleName} className="py-2 pr-3 text-center" title={note ?? undefined}>
          {!isOpen ? (
            count ?? 0
          ) : count == null ? (
            <span className="text-gray-300">—</span>
          ) : (
            <>
              {/* The baseline this input started from (last confirmed, or
                  the suggested count on a location's first-ever confirm) --
                  submitted alongside the edited value so the server can
                  tell a real reduction from a first-time entry without
                  needing prior confirmed_role_counts to exist. */}
              <input type="hidden" form={formId} name={`role_baseline_${roleName}`} value={previousCounts?.[roleName] ?? count} />
              <input
                key={`${roleName}-${resetCount}`}
                type="number"
                min={0}
                step={1}
                form={formId}
                name={`role_count_${roleName}`}
                defaultValue={resetCount === 0 ? previousCounts?.[roleName] ?? count : count}
                className="w-12 rounded-md border border-gray-300 px-1 py-0.5 text-center text-xs"
              />
            </>
          )}
        </td>
      ))}
      <td className="py-2 pr-3 font-medium" title="Suggested total from current staffing rules">
        {recommended}
      </td>
      <td className="py-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setResetCount((n) => n + 1)}
            title="Reload the suggested headcount for every role"
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
          >
            Reset
          </button>
          <button
            type="submit"
            form={formId}
            disabled={confirmDisabled}
            className="rounded-md bg-brand px-3 py-1 text-xs text-white disabled:opacity-40"
          >
            Confirm
          </button>
        </div>
      </td>
    </>
  );
}
