import { TrendingUp, TrendingDown, Minus, History } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PriceTrend } from "@/lib/types";

const DIRECTION = {
  rising: { label: "Rising", color: "text-steal", bg: "bg-steal/15", Icon: TrendingUp },
  stable: { label: "Stable", color: "text-fair", bg: "bg-fair/15", Icon: Minus },
  falling: { label: "Falling", color: "text-over", bg: "bg-over/15", Icon: TrendingDown },
} as const;

export function PriceHistoryCard({
  trend,
  snapshots,
}: {
  trend: PriceTrend | null;
  snapshots: { median: number | null; createdAt: string }[];
}) {
  const windows = trend
    ? [
        { label: "1 yr ago", value: trend.y1 },
        { label: "6 mo", value: trend.m6 },
        { label: "3 mo", value: trend.m3 },
        { label: "Now", value: trend.current },
      ]
    : [];
  const trendMax = Math.max(1, ...windows.map((w) => w.value ?? 0));
  const realSnaps = snapshots.filter((s) => s.median != null);
  const snapMax = Math.max(1, ...realSnaps.map((s) => s.median ?? 0));

  if (!trend && realSnaps.length < 2) return null;

  const dir = trend?.direction ? DIRECTION[trend.direction] : null;

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur-sm">
      <div className="mb-1 flex items-center gap-2">
        <History className="h-4 w-4 text-accent" />
        <h2 className="font-semibold">Price history &amp; trend</h2>
        {dir && (
          <span
            className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${dir.bg} ${dir.color}`}
          >
            <dir.Icon className="h-3.5 w-3.5" /> {dir.label}
          </span>
        )}
      </div>

      {trend && (
        <>
          <p className="mb-4 text-xs text-muted">Estimated median sold price over time.</p>
          <div className="flex items-end gap-3" style={{ height: 130 }}>
            {windows.map((w) => (
              <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold tabular-nums">
                  {w.value !== null ? formatCurrency(w.value) : "—"}
                </span>
                <div className="flex h-20 w-full items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-brand/40 to-brand"
                    style={{
                      height: `${w.value ? Math.max(6, (w.value / trendMax) * 100) : 2}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] text-muted">{w.label}</span>
              </div>
            ))}
          </div>
          {trend.note && (
            <p className="mt-4 text-sm leading-relaxed text-fg/90">{trend.note}</p>
          )}
          <p className="mt-2 text-[11px] text-muted">AI-estimated from sold listings — directional, not exact.</p>
        </>
      )}

      {realSnaps.length >= 2 ? (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-muted">
            Your tracked history ({realSnaps.length} re-checks)
          </div>
          <div className="flex items-end gap-1.5" style={{ height: 70 }}>
            {realSnaps.map((s, i) => (
              <div
                key={i}
                title={`${formatCurrency(s.median!)} · ${new Date(
                  s.createdAt
                ).toLocaleDateString()}`}
                className="flex-1 rounded-t bg-accent/60"
                style={{ height: `${Math.max(6, ((s.median ?? 0) / snapMax) * 100)}%` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted">
          Re-analyze this item over time to build a real tracked price history.
        </p>
      )}
    </div>
  );
}
