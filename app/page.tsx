import Link from "next/link";
import { ScanLine, TrendingUp, Package, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { parseNetProceeds } from "@/lib/item";
import type { Verdict } from "@/lib/types";
import { Card, VerdictBadge, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const items = await prisma.item.findMany({
    orderBy: { createdAt: "desc" },
    include: { photos: { orderBy: { order: "asc" }, take: 1 } },
  });

  let potentialProfit = 0;
  for (const it of items) {
    if (it.askingPrice && it.netProceeds) {
      const best = parseNetProceeds(it.netProceeds)[0]?.net;
      if (best) potentialProfit += best - it.askingPrice;
    }
  }
  const steals = items.filter((i) => i.verdict === "STEAL").length;

  return (
    <div className="space-y-7">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface/50 p-7">
        <div className="relative z-10 max-w-lg">
          <h1 className="text-3xl font-bold tracking-tight">
            Snap it. Price it. Profit.
          </h1>
          <p className="mt-2 text-muted">
            Photograph any object and instantly see what it resells for across eBay, Etsy,
            Mercari, Facebook Marketplace, Swappa and more — then know if it&apos;s a deal.
          </p>
          <Link
            href="/scan"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand to-brand-2 px-5 py-3 font-semibold text-white shadow-xl shadow-brand/30 transition hover:opacity-90"
          >
            <ScanLine className="h-5 w-5" /> Scan an item
          </Link>
        </div>
        <Sparkles className="absolute -right-6 -top-6 h-44 w-44 text-brand/10" />
      </div>

      {/* Stats */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Items" value={items.length} />
          <Stat
            label="Potential profit"
            value={formatCurrency(potentialProfit)}
            sub="best platform, after fees"
          />
          <Stat label="Steals found" value={steals} />
        </div>
      )}

      {/* Library */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Package className="h-5 w-5 text-muted" /> Your library
        </h2>

        {items.length === 0 ? (
          <Card className="grid place-items-center gap-3 p-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2">
              <TrendingUp className="h-7 w-7 text-muted" />
            </div>
            <div>
              <p className="font-medium">No items yet</p>
              <p className="text-sm text-muted">
                Scan your first item to see what it&apos;s worth.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/item/${item.id}`}
                className="group overflow-hidden rounded-2xl border border-border bg-surface/70 transition hover:border-brand/60"
              >
                <div className="aspect-square overflow-hidden bg-surface-2">
                  {item.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.photos[0].url}
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
                  <VerdictBadge verdict={item.verdict as Verdict | null} />
                  <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">{timeAgo(item.createdAt)}</span>
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
    </div>
  );
}
