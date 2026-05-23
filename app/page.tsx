import Link from "next/link";
import { ScanLine, Sparkles, Images } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { parseNetProceeds } from "@/lib/item";
import { Stat } from "@/components/ui";
import { LibraryBrowser, type LibItem } from "@/components/LibraryBrowser";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const items = await prisma.item.findMany({
    orderBy: { createdAt: "desc" },
    include: { photos: { orderBy: { order: "asc" }, take: 1 } },
  });

  const libItems: LibItem[] = items.map((it) => {
    const best = parseNetProceeds(it.netProceeds)[0]?.net ?? null;
    const profit =
      best !== null && it.askingPrice ? best - it.askingPrice : null;
    return {
      id: it.id,
      name: it.name,
      brand: it.brand,
      model: it.model,
      category: it.category,
      verdict: it.verdict,
      status: it.status,
      recommendedMedian: it.recommendedMedian,
      dealScore: it.dealScore,
      askingPrice: it.askingPrice,
      profit,
      createdAt: it.createdAt.toISOString(),
      photoUrl: it.photos[0]?.url ?? null,
    };
  });
  const potentialProfit = libItems.reduce((sum, it) => sum + (it.profit ?? 0), 0);
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
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand to-brand-2 px-5 py-3 font-semibold text-white shadow-xl shadow-brand/30 transition hover:opacity-90"
            >
              <ScanLine className="h-5 w-5" /> Scan an item
            </Link>
            <Link
              href="/batch"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 font-medium transition hover:border-brand"
            >
              <Images className="h-5 w-5" /> Bulk upload
            </Link>
          </div>
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
      <LibraryBrowser items={libItems} />
    </div>
  );
}
