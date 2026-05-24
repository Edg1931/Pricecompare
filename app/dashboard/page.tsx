import Link from "next/link";
import { BarChart3, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { realizedPnL } from "@/lib/analysis/deal";
import { Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const items = await prisma.item.findMany();
  const now = new Date();

  const sold = items.filter((i) => i.soldPrice != null);
  const rows = sold.map((i) => ({
    i,
    pnl: realizedPnL({
      purchasePrice: i.purchasePrice ?? i.askingPrice ?? null,
      soldPrice: i.soldPrice,
      soldMarketplace: i.soldMarketplace,
      shippingCost: i.shippingCost,
      feesOverride: i.soldFees,
    })!,
  }));

  const totalNet = rows.reduce((s, r) => s + r.pnl.net, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.pnl.revenue, 0);

  const roiRows = rows.filter((r) => r.pnl.cost > 0);
  const avgRoi =
    roiRows.length > 0
      ? Math.round(
          (roiRows.reduce((s, r) => s + r.pnl.net / r.pnl.cost, 0) / roiRows.length) * 100
        )
      : null;

  const dtsRows = rows.filter((r) => r.i.boughtAt && r.i.soldAt);
  const avgDays =
    dtsRows.length > 0
      ? Math.round(
          dtsRows.reduce(
            (s, r) => s + (r.i.soldAt!.getTime() - r.i.boughtAt!.getTime()) / 86400000,
            0
          ) / dtsRows.length
        )
      : null;

  // Monthly realized profit (last 8 months)
  const months = Array.from({ length: 8 }, (_, idx) => {
    const k = 7 - idx;
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    return { y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleString("en-US", { month: "short" }), net: 0 };
  });
  for (const { i, pnl } of rows) {
    if (!i.soldAt) continue;
    const mm = months.find((x) => x.y === i.soldAt!.getFullYear() && x.m === i.soldAt!.getMonth());
    if (mm) mm.net += pnl.net;
  }
  const maxMonth = Math.max(1, ...months.map((m) => Math.abs(m.net)));

  // Profit by category
  const cat = new Map<string, { net: number; count: number }>();
  for (const { i, pnl } of rows) {
    const key = i.category ?? "Uncategorized";
    const cur = cat.get(key) ?? { net: 0, count: 0 };
    cur.net += pnl.net;
    cur.count += 1;
    cat.set(key, cur);
  }
  const catRows = [...cat.entries()].sort((a, b) => b[1].net - a[1].net).slice(0, 6);
  const maxCat = Math.max(1, ...catRows.map(([, v]) => Math.abs(v.net)));

  // Inventory snapshot
  const holding = items.filter(
    (i) => (i.status === "bought" || i.status === "listed") && i.soldPrice == null
  );
  const capital = holding.reduce((s, i) => s + (i.purchasePrice ?? i.askingPrice ?? 0), 0);
  const aging = holding.filter(
    (i) => (now.getTime() - (i.boughtAt ?? i.createdAt).getTime()) / 86400000 >= 60
  ).length;

  return (
    <div className="space-y-7">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <BarChart3 className="h-6 w-6 text-brand" /> Dashboard
      </h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Net profit (realized)"
          value={
            <span className={totalNet >= 0 ? "text-steal" : "text-over"}>
              {formatCurrency(totalNet)}
            </span>
          }
          sub={`${formatCurrency(totalRevenue)} revenue`}
        />
        <Stat label="Items sold" value={sold.length} />
        <Stat label="Avg ROI" value={avgRoi != null ? `${avgRoi}%` : "—"} />
        <Stat label="Avg days to sell" value={avgDays != null ? `${avgDays}d` : "—"} />
      </div>

      {sold.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/70 p-8 text-center text-sm text-muted">
          Sell some items (mark them Sold) to see profit trends and category
          performance here.
        </div>
      ) : (
        <>
          {/* Monthly profit */}
          <section className="rounded-2xl border border-border bg-surface/70 p-5">
            <h2 className="mb-4 font-semibold">Realized profit by month</h2>
            <div className="flex items-end gap-2" style={{ height: 140 }}>
              {months.map((m, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] tabular-nums text-muted">
                    {m.net ? formatCurrency(m.net) : ""}
                  </span>
                  <div className="flex h-24 w-full items-end">
                    <div
                      className={`w-full rounded-t-md ${m.net >= 0 ? "bg-gradient-to-t from-brand/40 to-brand" : "bg-over/60"}`}
                      style={{ height: `${m.net ? Math.max(4, (Math.abs(m.net) / maxMonth) * 100) : 1}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted">{m.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Category performance */}
          {catRows.length > 0 && (
            <section className="rounded-2xl border border-border bg-surface/70 p-5">
              <h2 className="mb-4 font-semibold">Top categories by profit</h2>
              <div className="space-y-2">
                {catRows.map(([name, v]) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-32 shrink-0 truncate text-sm">
                      {name}
                      <span className="ml-1 text-xs text-muted">({v.count})</span>
                    </div>
                    <div className="h-5 flex-1 overflow-hidden rounded-md bg-surface-2">
                      <div
                        className={`h-full rounded-md ${v.net >= 0 ? "bg-steal/60" : "bg-over/60"}`}
                        style={{ width: `${Math.max(6, (Math.abs(v.net) / maxCat) * 100)}%` }}
                      />
                    </div>
                    <div className={`w-24 shrink-0 text-right text-sm font-semibold tabular-nums ${v.net >= 0 ? "text-steal" : "text-over"}`}>
                      {formatCurrency(v.net)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Inventory snapshot */}
      <section className="rounded-2xl border border-border bg-surface/70 p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-semibold">Inventory</h2>
          <Link
            href="/inventory"
            className="ml-auto inline-flex items-center gap-1 text-sm text-muted transition hover:text-brand"
          >
            Details <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="In inventory" value={holding.length} />
          <Stat label="Capital tied up" value={formatCurrency(capital)} />
          <Stat
            label="Aging (60+ days)"
            value={<span className={aging > 0 ? "text-over" : ""}>{aging}</span>}
          />
        </div>
      </section>
    </div>
  );
}
