// Categorical order from the dataviz skill's validated reference
// palette (adjacent-pair checks pass through slot 6; past that, folded
// into a neutral "Other" bucket rather than generating a new hue).
const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const OTHER_COLOR = "#9ca3af";

export type DonutSlice = { label: string; value: number };

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatCount(value: number) {
  return Math.round(value).toLocaleString();
}

// Folds anything past the validated categorical slot count into a
// single "Other" slice rather than generating additional hues.
function toColoredSlices(slices: DonutSlice[]): (DonutSlice & { color: string })[] {
  const sorted = [...slices].filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, SERIES_COLORS.length);
  const rest = sorted.slice(SERIES_COLORS.length);
  const colored = head.map((s, i) => ({ ...s, color: SERIES_COLORS[i] }));
  const otherTotal = rest.reduce((sum, s) => sum + s.value, 0);
  if (otherTotal > 0) {
    colored.push({ label: `Other (${rest.length})`, value: otherTotal, color: OTHER_COLOR });
  }
  return colored;
}

export function DonutChart({
  slices,
  centerLabel,
  format = "currency",
  emptyLabel = "No data on record yet.",
}: {
  slices: DonutSlice[];
  centerLabel?: string;
  format?: "currency" | "count";
  emptyLabel?: string;
}) {
  const fmt = format === "count" ? formatCount : formatCurrency;
  const colored = toColoredSlices(slices);
  const total = colored.reduce((sum, s) => sum + s.value, 0);

  if (!total) {
    return <p className="text-sm text-gray-400">{emptyLabel}</p>;
  }

  let acc = 0;
  const stops = colored.map((s) => {
    const start = (acc / total) * 100;
    acc += s.value;
    const end = (acc / total) * 100;
    return `${s.color} ${start}% ${end}%`;
  });

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div
        className="relative h-36 w-36 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
      >
        <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-white text-center">
          <span className="text-sm font-semibold">{fmt(total)}</span>
          {centerLabel && <span className="text-[10px] text-gray-400">{centerLabel}</span>}
        </div>
      </div>
      <table className="text-left text-sm">
        <tbody>
          {colored.map((s) => (
            <tr key={s.label}>
              <td className="py-0.5 pr-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              </td>
              <td className="py-0.5 pr-3 text-gray-700">{s.label}</td>
              <td className="py-0.5 pr-3 text-right text-gray-500">{fmt(s.value)}</td>
              <td className="py-0.5 text-right text-gray-400">{((s.value / total) * 100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
