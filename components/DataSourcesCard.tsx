import { CheckCircle2, XCircle } from "lucide-react";

export interface SourceStatus {
  label: string;
  configured: boolean;
  detail: string;
}

/**
 * Which live pricing feeds this deployment is actually pulling from — so a
 * "why are my comps thin?" question is answerable at a glance instead of
 * silently degrading.
 */
export function DataSourcesCard({ sources }: { sources: SourceStatus[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-1 font-semibold">Live data sources</h2>
      <p className="mb-4 text-sm text-muted">
        Where price comps come from. Anything off falls back to the other
        sources, with less coverage.
      </p>
      <ul className="space-y-3">
        {sources.map((s) => (
          <li key={s.label} className="flex items-start gap-3">
            {s.configured ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-steal" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-over" />
            )}
            <div>
              <span className="text-sm font-medium">{s.label}</span>{" "}
              <span
                className={`text-xs font-semibold uppercase ${s.configured ? "text-steal" : "text-over"}`}
              >
                {s.configured ? "on" : "off"}
              </span>
              <p className="text-xs text-muted">{s.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
