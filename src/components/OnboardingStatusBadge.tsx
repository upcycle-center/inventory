const COLOR_CLASSES = {
  gray: { pill: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
  amber: { pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  green: { pill: "bg-green-100 text-green-700", dot: "bg-green-500" },
} as const;

function Pill({ color, label, title }: { color: keyof typeof COLOR_CLASSES; label: string; title?: string }) {
  const c = COLOR_CLASSES[color];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${c.pill}`} title={title}>
      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
}

// Shared onboarding pipeline badge for both Roster and system Users:
// Orientation (never completed a required certification) -> Certification
// (has certified before -- an expired cert still counts, it just needs
// renewal -- or no certification is required at all, just awaiting the
// ready-to-work sign-off) -> Cleared (fully cleared to work). Deactivated
// people always just show Inactive regardless of the above.
export function OnboardingStatusBadge({
  active,
  reasons,
  hasStartedCertification,
}: {
  active: boolean;
  reasons: string[];
  hasStartedCertification: boolean;
}) {
  if (!active) return <Pill color="gray" label="Inactive" />;
  if (!reasons.length) return <Pill color="green" label="Cleared" />;
  return (
    <Pill
      color={hasStartedCertification ? "amber" : "gray"}
      label={hasStartedCertification ? "Certification" : "Orientation"}
      title={reasons.join(" · ")}
    />
  );
}
