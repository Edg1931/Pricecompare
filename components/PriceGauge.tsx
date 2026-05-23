import { formatCurrency } from "@/lib/utils";

export function PriceGauge({
  low,
  median,
  high,
  asking,
}: {
  low: number | null;
  median: number | null;
  high: number | null;
  asking: number | null;
}) {
  if (low === null || median === null || high === null || high <= low) {
    return null;
  }

  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const toPct = (v: number) => clamp(((v - low) / (high - low)) * 100);
  const medianPct = toPct(median);
  const askingPct = asking !== null ? toPct(asking) : null;
  const askingBelow = asking !== null && asking <= median;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted">Market range</span>
        <span className="font-semibold tabular-nums">
          {formatCurrency(low)} – {formatCurrency(high)}
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-gradient-to-r from-steal/60 via-fair/60 to-over/60">
        {/* median marker */}
        <div
          className="absolute -top-1 h-5 w-0.5 bg-fg/80"
          style={{ left: `${medianPct}%` }}
          title={`Median ${formatCurrency(median)}`}
        />
        {/* asking marker */}
        {askingPct !== null && (
          <div
            className="absolute -top-2.5 z-10 -translate-x-1/2"
            style={{ left: `${askingPct}%` }}
          >
            <div
              className={`h-8 w-8 -translate-y-0 rounded-full border-2 border-bg shadow-lg ${
                askingBelow ? "bg-steal" : "bg-over"
              } grid place-items-center text-[9px] font-bold text-white`}
            >
              YOU
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Low</span>
        <span className="font-medium text-fg">Median {formatCurrency(median)}</span>
        <span>High</span>
      </div>
    </div>
  );
}
