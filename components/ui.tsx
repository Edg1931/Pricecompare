import { cn } from "@/lib/utils";
import { VERDICT_META } from "@/lib/display";
import type { Verdict } from "@/lib/types";

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
