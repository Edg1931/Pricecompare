import { ExternalLink, Tags } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { sourceMeta } from "@/lib/display";
import { searchUrlForSource } from "@/lib/marketplaces";

/**
 * The spread that drives a flip: what the item costs NEW right now vs. what
 * it's currently reselling for — plus the current median on each marketplace
 * we found comps on, each linked to a live search there.
 */
export function NewVsResaleCard({
  retailPrice,
  retailNote,
  median,
  bySource,
  searchQuery,
}: {
  retailPrice: number | null;
  retailNote: string | null;
  median: number | null;
  bySource: Record<string, { count: number; median: number }>;
  searchQuery: string;
}) {
  const sources = Object.entries(bySource)
    .filter(([, v]) => v && v.count > 0 && v.median > 0)
    .sort((a, b) => b[1].count - a[1].count);

  if (retailPrice == null && sources.length === 0) return null;

  const pctOfNew =
    retailPrice != null && median != null && retailPrice > 0
      ? Math.round((median / retailPrice) * 100)
      : null;

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Tags className="h-4 w-4 text-accent" />
        <h2 className="font-semibold">New vs. resale</h2>
      </div>

      {retailPrice != null && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-surface-2/50 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted">New (retail)</div>
            <div className="mt-0.5 text-xl font-semibold tabular-nums">
              {formatCurrency(retailPrice)}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface-2/50 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted">Resale (median)</div>
            <div className="mt-0.5 text-xl font-semibold tabular-nums">
              {median != null ? formatCurrency(median) : "—"}
              {pctOfNew != null && (
                <span className="ml-2 text-sm font-medium text-muted">
                  {pctOfNew}% of new
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      {retailNote && (
        <p className="mb-4 -mt-2 text-xs text-muted">{retailNote}</p>
      )}

      {sources.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Current resale by marketplace
          </p>
          <div className="space-y-1.5">
            {sources.map(([source, v]) => {
              const meta = sourceMeta(source);
              return (
                <a
                  key={source}
                  href={searchUrlForSource(source, searchQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-surface-2"
                  title={`Open a live ${meta.label} search`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                  <span className="flex-1 text-sm">
                    {meta.label}
                    <span className="ml-1.5 text-xs text-muted">
                      ({v.count} comp{v.count === 1 ? "" : "s"})
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(v.median)}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted transition group-hover:text-brand" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
