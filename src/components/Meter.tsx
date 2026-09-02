export function Meter({
  label,
  numerator,
  denominator,
  color = "#2a78d6",
}: {
  label: string;
  numerator: number;
  denominator: number;
  color?: string;
}) {
  const pct = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-2xl font-semibold">{pct}%</span>
        <span className="text-xs text-gray-400">
          {numerator} / {denominator}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}
