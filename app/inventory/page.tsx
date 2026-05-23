import Link from "next/link";
import { Package, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { realizedPnL } from "@/lib/analysis/deal";
import { parseNetProceeds } from "@/lib/item";
import { Stat } from "@/components/ui";
import { PnlExportButton, type PnlRow } from "@/components/ReportExport";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const items = await prisma.item.findMany({
    orderBy: { createdAt: "desc" },
    include: { photos: { orderBy: { order: "asc" }, take: 1 } },
  });

  const holding = items.filter(
    (i) => (i.status === "bought" || i.status === "listed") && i.soldPrice == null
  );
  const sold = items
    .filter((i) => i.soldPrice != null)
    .sort((a, b) => (b.soldAt?.getTime() ?? 0) - (a.soldAt?.getTime() ?? 0));

  let capitalInvested = 0;
  for (const i of holding) capitalInvested += i.purchasePrice ?? i.askingPrice ?? 0;

  const totals = { revenue: 0, cost: 0, fees: 0, shipping: 0, net: 0 };
  const soldRows = sold.map((i) => {
    const cost = i.purchasePrice ?? i.askingPrice ?? null;
    const pnl = realizedPnL({
      purchasePrice: cost,
      soldPrice: i.soldPrice,
      soldMarketplace: i.soldMarketplace,
      shippingCost: i.shippingCost,
    })!;
    totals.revenue += pnl.revenue;
    totals.cost += pnl.cost;
    totals.fees += pnl.fees;
    totals.shipping += pnl.shipping;
    totals.net += pnl.net;
    return { item: i, pnl };
  });

  const reportRows: PnlRow[] = [
    ...soldRows.map(({ item, pnl }) => ({
      name: item.name,
      status: "sold",
      marketplace: item.soldMarketplace,
      cost: pnl.cost,
      soldPrice: pnl.revenue,
      fees: pnl.fees,
      shipping: pnl.shipping,
      net: pnl.net,
      soldAt: item.soldAt ? item.soldAt.toISOString().slice(0, 10) : "",
    })),
    ...holding.map((item) => ({
      name: item.name,
      status: item.status,
      marketplace: null,
      cost: item.purchasePrice ?? item.askingPrice ?? null,
      soldPrice: null,
      fees: null,
      shipping: null,
      net: null,
      soldAt: "",
    })),
  ];

  const hasData = holding.length > 0 || sold.length > 0;

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory &amp; P&amp;L</h1>
          <p className="text-sm text-muted">Track what you own, what you sold, and your realized profit.</p>
        </div>
        {hasData && <PnlExportButton rows={reportRows} totals={totals} />}
      </div>

      {!hasData ? (
        <div className="grid place-items-center gap-3 rounded-2xl border border-border bg-surface/70 p-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2">
            <Package className="h-7 w-7 text-muted" />
          </div>
          <div>
            <p className="font-medium">Nothing in inventory yet</p>
            <p className="text-sm text-muted">
              Open an item and mark it <span className="font-medium">Bought</span> to start tracking.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Company-wide totals */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="In inventory" value={holding.length} sub={`${formatCurrency(capitalInvested)} invested`} />
            <Stat label="Items sold" value={sold.length} />
            <Stat label="Revenue" value={formatCurrency(totals.revenue)} sub={`fees ${formatCurrency(totals.fees)} · ship ${formatCurrency(totals.shipping)}`} />
            <Stat
              label="Net realized P&L"
              value={
                <span className={totals.net >= 0 ? "text-steal" : "text-over"}>
                  {formatCurrency(totals.net)}
                </span>
              }
            />
          </div>

          {/* Holding */}
          {holding.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">
                Holding <span className="text-sm font-normal text-muted">({holding.length})</span>
              </h2>
              <div className="space-y-2">
                {holding.map((item) => {
                  const cost = item.purchasePrice ?? item.askingPrice ?? null;
                  const projected = parseNetProceeds(item.netProceeds)[0]?.net ?? null;
                  return (
                    <Link
                      key={item.id}
                      href={`/item/${item.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-surface/70 p-2.5 transition hover:border-brand/60"
                    >
                      <Thumb url={item.photos[0]?.url} name={item.name} />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted">
                          Cost {cost != null ? formatCurrency(cost) : "—"}
                          {projected != null && cost != null && (
                            <> · est. profit {formatCurrency(projected - cost)}</>
                          )}
                        </p>
                      </div>
                      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium capitalize text-muted">
                        {item.status}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Sold */}
          {soldRows.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">
                Sold <span className="text-sm font-normal text-muted">({soldRows.length})</span>
              </h2>
              <div className="space-y-2">
                {soldRows.map(({ item, pnl }) => (
                  <Link
                    key={item.id}
                    href={`/item/${item.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface/70 p-2.5 transition hover:border-brand/60"
                  >
                    <Thumb url={item.photos[0]?.url} name={item.name} />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted">
                        {formatCurrency(pnl.revenue)}
                        {item.soldMarketplace ? ` · ${item.soldMarketplace}` : ""}
                        {item.soldAt ? ` · ${item.soldAt.toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`text-sm font-semibold tabular-nums ${pnl.net >= 0 ? "text-steal" : "text-over"}`}>
                        {formatCurrency(pnl.net)}
                      </div>
                      <div className="text-[11px] text-muted">net</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Thumb({ url, name }: { url?: string; name: string }) {
  if (!url) {
    return (
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
        <Package className="h-5 w-5" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />;
}
