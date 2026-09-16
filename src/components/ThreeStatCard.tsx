// A "N : N : N" labeled stat card -- shared by the Dashboard's WFM
// Shifts/Call-Outs cards and the Workforce Attendance report's month
// snapshot, so the two stay visually identical.
export function ThreeStatCard({
  values,
  labels,
  className = "",
}: {
  values: [number, number, number];
  labels: [string, string, string];
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-gray-200 bg-white p-5 ${className}`}>
      <div className="flex items-start justify-center gap-3">
        {values.map((value, i) => (
          <div key={labels[i]} className="flex items-center gap-3">
            {i > 0 && <p className="text-2xl font-bold text-gray-300">:</p>}
            <div className="text-center">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-gray-500">{labels[i]}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
