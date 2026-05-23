"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Package, Search, TrendingUp } from "lucide-react";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { VerdictBadge, StatusBadge } from "@/components/ui";
import { STATUS_OPTIONS, statusMeta } from "@/lib/display";
import type { Verdict } from "@/lib/types";

export interface LibItem {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  verdict: string | null;
  status: string | null;
  recommendedMedian: number | null;
  dealScore: number | null;
  askingPrice: number | null;
  profit: number | null;
  createdAt: string;
  photoUrl: string | null;
}

function downloadCsv(items: LibItem[]) {
  const headers = [
    "Name",
    "Brand",
    "Model",
    "Category",
    "Verdict",
    "Status",
    "Asking",
    "Est. median",
    "Est. profit",
    "Added",
  ];
  const esc = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = items.map((it) =>
    [
      it.name,
      it.brand,
      it.model,
      it.category,
      it.verdict,
      statusMeta(it.status).label,
      it.askingPrice,
      it.recommendedMedian,
      it.profit != null ? Math.round(it.profit * 100) / 100 : null,
      new Date(it.createdAt).toISOString().slice(0, 10),
    ]
      .map(esc)
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reseller-library-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const VERDICT_FILTERS = ["All", "STEAL", "GOOD", "FAIR", "OVERPRICED"] as const;
type VerdictFilter = (typeof VERDICT_FILTERS)[number];

const SORTS = {
  newest: "Newest",
  value: "Highest value",
  deal: "Best deal",
  profit: "Most profit",
} as const;
type SortKey = keyof typeof SORTS;

const FILTER_LABEL: Record<VerdictFilter, string> = {
  All: "All",
  STEAL: "Steals",
  GOOD: "Good",
  FAIR: "Fair",
  OVERPRICED: "Overpriced",
};

export function LibraryBrowser({ items }: { items: LibItem[] }) {
  const [query, setQuery] = useState("");
  const [verdict, setVerdict] = useState<VerdictFilter>("All");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = items.filter((it) => {
      if (verdict !== "All" && it.verdict !== verdict) return false;
      if (status !== "all" && (it.status ?? "analyzed") !== status) return false;
      if (!q) return true;
      return [it.name, it.brand, it.model, it.category]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });

    out = [...out].sort((a, b) => {
      switch (sort) {
        case "value":
          return (b.recommendedMedian ?? 0) - (a.recommendedMedian ?? 0);
        case "deal":
          return (b.dealScore ?? -1) - (a.dealScore ?? -1);
        case "profit":
          return (b.profit ?? -Infinity) - (a.profit ?? -Infinity);
        case "newest":
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
    return out;
  }, [items, query, verdict, status, sort]);

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <Package className="h-5 w-5 text-muted" /> Your library
        <span className="text-sm font-normal text-muted">({items.length})</span>
        {items.length > 0 && (
          <button
            onClick={() => downloadCsv(visible)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted transition hover:text-fg"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        )}
      </h2>

      {items.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="flex items-center rounded-xl border border-border bg-surface px-3">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, brand, model…"
              className="w-full bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-muted"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {VERDICT_FILTERS.map((v) => (
              <button
                key={v}
                onClick={() => setVerdict(v)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  verdict === v
                    ? "bg-brand text-white"
                    : "bg-surface-2 text-muted hover:text-fg"
                }`}
              >
                {FILTER_LABEL[v]}
              </button>
            ))}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="ml-auto rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-muted outline-none"
            >
              <option value="all">Status: All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {statusMeta(s).label}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-muted outline-none"
            >
              {Object.entries(SORTS).map(([key, label]) => (
                <option key={key} value={key}>
                  Sort: {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-2xl border border-border bg-surface/70 p-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2">
            <TrendingUp className="h-7 w-7 text-muted" />
          </div>
          <div>
            <p className="font-medium">No items yet</p>
            <p className="text-sm text-muted">Scan your first item to see what it&apos;s worth.</p>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface/70 p-8 text-center text-sm text-muted">
          No items match your search.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((item) => (
            <Link
              key={item.id}
              href={`/item/${item.id}`}
              className="group overflow-hidden rounded-2xl border border-border bg-surface/70 transition hover:border-brand/60"
            >
              <div className="aspect-square overflow-hidden bg-surface-2">
                {item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-muted">
                    <Package className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="space-y-1.5 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <VerdictBadge verdict={item.verdict as Verdict | null} />
                  <StatusBadge status={item.status} />
                </div>
                <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">{timeAgo(new Date(item.createdAt))}</span>
                  <span className="font-semibold tabular-nums">
                    {item.recommendedMedian !== null
                      ? formatCurrency(item.recommendedMedian)
                      : "—"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
