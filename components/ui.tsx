import { cn, formatCurrency } from "@/lib/utils";
import { VERDICT_META } from "@/lib/display";
import type { SourcingMetrics, Verdict } from "@/lib/types";
import { TrendingUp } from "lucide-react";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface/70 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function VerdictBadge({
  verdict,
  className,
}: {
  verdict: Verdict | null;
  className?: string;
}) {
  if (!verdict) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted",
          className
        )}
      >
        Unscored
      </span>
    );
  }
  const m = VERDICT_META[verdict];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        m.bg,
        m.color,
        className
      )}
    >
      <span>{m.emoji}</span>
      {m.label}
    </span>
  );
}

export function ConfidenceBar({
  value,
  label,
}: {
  value: number | null;
  label: string;
}) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="font-medium text-fg">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const SOURCING_META = {
  BUY: { label: "Buy it", color: "text-steal", bg: "bg-steal/15", emoji: "✅" },
  CONSIDER: { label: "Consider", color: "text-fair", bg: "bg-fair/15", emoji: "🤔" },
  PASS: { label: "Pass", color: "text-over", bg: "bg-over/15", emoji: "🚫" },
} as const;

export function SourcingCard({ metrics }: { metrics: SourcingMetrics }) {
  const m = SOURCING_META[metrics.recommendation];
  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-brand" />
        <h2 className="font-semibold">Should you buy it?</h2>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
            m.bg,
            m.color
          )}
        >
          <span>{m.emoji}</span>
          {m.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Est. profit"
          value={
            <span className={metrics.profit >= 0 ? "text-steal" : "text-over"}>
              {formatCurrency(metrics.profit)}
            </span>
          }
          sub={metrics.bestPlatform ? `on ${metrics.bestPlatform}` : undefined}
        />
        <Stat
          label="ROI"
          value={
            <span className={metrics.roiPct >= 0 ? "text-steal" : "text-over"}>
              {metrics.roiPct > 0 ? "+" : ""}
              {metrics.roiPct}%
            </span>
          }
          sub="after fees"
        />
        <Stat
          label="Break-even"
          value={formatCurrency(metrics.breakEvenSell)}
          sub="resale price"
        />
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/50 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
