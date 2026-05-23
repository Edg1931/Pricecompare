import { ExternalLink, Share2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { sourceMeta } from "@/lib/display";
import type { CrossListing } from "@/lib/crosslist";
import { CopyButton } from "@/components/Copyable";

function dotFor(platform: string): string {
  if (platform.toLowerCase().includes("ebay")) return sourceMeta("ebay").dot;
  if (platform.toLowerCase().includes("facebook")) return sourceMeta("facebook").dot;
  if (platform.toLowerCase().includes("etsy")) return sourceMeta("etsy").dot;
  return "bg-muted";
}

export function CrossListCard({ listings }: { listings: CrossListing[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur-sm">
      <div className="mb-1 flex items-center gap-2">
        <Share2 className="h-4 w-4 text-accent" />
        <h2 className="font-semibold">Cross-list it</h2>
      </div>
      <p className="mb-4 text-sm text-muted">
        Platform-ready drafts. Copy the fields and tap to open each site&apos;s
        new-listing page.
      </p>

      <div className="space-y-4">
        {listings.map((l) => (
          <div key={l.platform} className="rounded-xl border border-border bg-surface-2/40 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dotFor(l.platform)}`} />
              <span className="text-sm font-semibold">{l.platform}</span>
              {l.price != null && (
                <span className="text-xs text-muted">· list at {formatCurrency(l.price)}</span>
              )}
              <a
                href={l.createUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted transition hover:text-brand"
              >
                Open <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="space-y-2">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    Title{" "}
                    <span className="normal-case">
                      ({l.title.length}/{l.titleLimit})
                    </span>
                  </span>
                  <CopyButton text={l.title} />
                </div>
                <p className="rounded-lg bg-surface px-3 py-2 text-sm font-medium">{l.title}</p>
              </div>

              {l.description && (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-muted">Description</span>
                    <CopyButton text={l.description} />
                  </div>
                  <p className="line-clamp-3 whitespace-pre-wrap rounded-lg bg-surface px-3 py-2 text-sm text-fg/90">
                    {l.description}
                  </p>
                </div>
              )}

              {l.tags && l.tags.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-muted">Tags</span>
                    <CopyButton text={l.tags.join(", ")} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {l.tags.map((t) => (
                      <span key={t} className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
