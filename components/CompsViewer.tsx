"use client";

import { useMemo, useState } from "react";
import { ExternalLink, ImageOff } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { sourceMeta } from "@/lib/display";

export type CompForViewer = {
  id: string;
  source: string;
  title: string;
  price: number;
  currency: string | null;
  url: string | null;
  imageUrl: string | null;
  condition: string | null;
  listingType: string | null;
};

type Filter = "all" | "sold" | "active";

export function CompsViewer({
  comps,
  itemCondition,
}: {
  comps: CompForViewer[];
  itemCondition: string | null;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [matchCondition, setMatchCondition] = useState(false);

  const soldCount = useMemo(
    () => comps.filter((c) => c.listingType === "sold").length,
    [comps]
  );
  const activeCount = comps.length - soldCount;

  const filtered = useMemo(() => {
    return comps.filter((c) => {
      if (filter === "sold" && c.listingType !== "sold") return false;
      if (filter === "active" && c.listingType !== "active") return false;
      if (
        matchCondition &&
        itemCondition &&
        (c.condition ?? "").toLowerCase() !== itemCondition.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [comps, filter, matchCondition, itemCondition]);

  const withImage = filtered.filter((c) => c.imageUrl);
  const withoutImage = filtered.filter((c) => !c.imageUrl);

  const groupedWithImage = useMemo(() => {
    const m = new Map<string, CompForViewer[]>();
    for (const c of withImage) {
      const arr = m.get(c.source) ?? [];
      arr.push(c);
      m.set(c.source, arr);
    }
    return m;
  }, [withImage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
          All <span className="opacity-70">({comps.length})</span>
        </FilterPill>
        {soldCount > 0 && (
          <FilterPill
            active={filter === "sold"}
            onClick={() => setFilter("sold")}
          >
            Sold only <span className="opacity-70">({soldCount})</span>
          </FilterPill>
        )}
        {activeCount > 0 && (
          <FilterPill
            active={filter === "active"}
            onClick={() => setFilter("active")}
          >
            Active only <span className="opacity-70">({activeCount})</span>
          </FilterPill>
        )}
        {itemCondition && (
          <label className="ml-auto inline-flex cursor-pointer select-none items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={matchCondition}
              onChange={(e) => setMatchCondition(e.target.checked)}
              className="h-3.5 w-3.5 accent-brand"
            />
            Match <span className="text-fg">{itemCondition}</span> only
          </label>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface-2/30 px-4 py-6 text-center text-sm text-muted">
          No comps match this filter.
        </p>
      ) : (
        <div className="space-y-5">
          {[...groupedWithImage.entries()].map(([source, srcComps]) => {
            const meta = sourceMeta(source);
            return (
              <div key={source}>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  {meta.label}
                  <span className="text-xs text-muted">({srcComps.length})</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {srcComps.map((c) => (
                    <CompTile key={c.id} comp={c} />
                  ))}
                </div>
              </div>
            );
          })}

          {withoutImage.length > 0 && (
            <CompactList comps={withoutImage} />
          )}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? "bg-brand text-white shadow shadow-brand/20"
          : "border border-border bg-surface-2 text-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function CompTile({ comp: c }: { comp: CompForViewer }) {
  const inner = (
    <>
      <div className="relative aspect-square w-full overflow-hidden bg-surface">
        {c.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <ImageOff className="h-6 w-6" />
          </div>
        )}
        {c.listingType === "sold" && (
          <span className="absolute right-1.5 top-1.5 rounded bg-steal px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white shadow">
            sold
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-2 py-1.5">
        <div className="flex items-center justify-between gap-1.5">
          <span className="font-semibold tabular-nums">
            {formatCurrency(c.price, c.currency ?? "USD")}
          </span>
          {c.url && (
            <ExternalLink className="h-3 w-3 shrink-0 text-muted transition group-hover:text-brand" />
          )}
        </div>
        <span className="line-clamp-2 text-xs leading-snug text-muted">
          {c.title}
        </span>
      </div>
    </>
  );
  const cls =
    "group flex flex-col overflow-hidden rounded-lg border border-border bg-surface-2/40 transition hover:border-brand hover:bg-surface-2";
  return c.url ? (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      title={c.title}
      className={cls}
    >
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function CompactList({ comps }: { comps: CompForViewer[] }) {
  const grouped = new Map<string, CompForViewer[]>();
  for (const c of comps) {
    const arr = grouped.get(c.source) ?? [];
    arr.push(c);
    grouped.set(c.source, arr);
  }
  return (
    <div className="rounded-lg border border-border bg-surface-2/30 px-4 py-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
        Other price points seen in research
      </p>
      <div className="space-y-1.5">
        {[...grouped.entries()].map(([source, srcComps]) => {
          const meta = sourceMeta(source);
          return (
            <div
              key={source}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
            >
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
              {srcComps.map((c) =>
                c.url ? (
                  <a
                    key={c.id}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={c.title}
                    className="text-sm font-medium tabular-nums text-fg/90 transition hover:text-brand"
                  >
                    {formatCurrency(c.price, c.currency ?? "USD")}
                    {c.listingType === "sold" && (
                      <span className="ml-1 text-[10px] uppercase text-steal">
                        sold
                      </span>
                    )}
                  </a>
                ) : (
                  <span
                    key={c.id}
                    title={c.title}
                    className="text-sm tabular-nums text-muted"
                  >
                    {formatCurrency(c.price, c.currency ?? "USD")}
                  </span>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
