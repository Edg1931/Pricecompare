import Link from "next/link";
import { Package, ArrowRight, Receipt } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { realizedPnL } from "@/lib/analysis/deal";
import { parseNetProceeds } from "@/lib/item";
import { currentUserId, ownerWhere } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Stat } from "@/components/ui";
import { PnlExportButton, type PnlRow } from "@/components/ReportExport";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const userId = await currentUserId();
  const settings = await getSettings(userId);
  const items = await prisma.item.findMany({
    where: ownerWhere(userId),
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

  const totals = { revenue: 0, cost: 0, fees: 0, shipping: 0, net: 0, tax: 0, afterTax: 0 };
  const soldRows = sold.map((i) => {
    const cost = i.purchasePrice ?? i.askingPrice ?? null;
    const pnl = realizedPnL({
      purchasePrice: cost,
      soldPrice: i.soldPrice,
      soldMarketplace: i.soldMarketplace,
      shippingCost: i.shippingCost,
      feesOverride: i.soldFees,
      taxRate: settings.taxRate,
    })!;
    totals.revenue += pnl.revenue;
    totals.cost += pnl.cost;
    totals.fees += pnl.fees;
    totals.shipping += pnl.shipping;
    totals.net += pnl.net;
    totals.tax += pnl.tax;
    totals.afterTax += pnl.afterTax;
    return { item: i, pnl };
  });

  // Realized profit by period (from the sale date).
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const period = { mtd: 0, qtd: 0, ytd: 0 };
  for (const { item, pnl } of soldRows) {
    if (!item.soldAt) continue;
    if (item.soldAt >= startOfMonth) period.mtd += pnl.net;
    if (item.soldAt >= startOfQuarter) period.qtd += pnl.net;
    if (item.soldAt >= startOfYear) period.ytd += pnl.net;
  }

  // Profit grouped by marketplace.
  const byMkt = new Map<string, { count: number; revenue: number; net: number }>();
  for (const { item, pnl } of soldRows) {
    const key = item.soldMarketplace ?? "Unknown";
    const cur = byMkt.get(key) ?? { count: 0, revenue: 0, net: 0 };
    cur.count += 1;
    cur.revenue += pnl.revenue;
    cur.net += pnl.net;
    byMkt.set(key, cur);
  }
  const mktRows = [...byMkt.entries()].sort((a, b) => b[1].net - a[1].net);
  const maxMktNet = Math.max(1, ...mktRows.map(([, v]) => Math.abs(v.net)));

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
      tax: pnl.tax,
      afterTax: pnl.afterTax,
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
      tax: null,
      afterTax: null,
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
        <div className="flex items-center gap-2">
          <Link
            href="/expenses"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-muted transition hover:text-fg"
          >
            <Receipt className="h-4 w-4" /> Expenses
          </Link>
          {hasData && <PnlExportButton rows={reportRows} totals={totals} />}
        </div>
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
              sub={`${formatCurrency(totals.afterTax)} after est. tax`}
            />
          </div>

          {/* Realized profit by period */}
          {soldRows.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Stat
                label="This month"
                value={
                  <span className={period.mtd >= 0 ? "text-steal" : "text-over"}>
                    {formatCurrency(period.mtd)}
                  </span>
                }
              />
              <Stat
                label="This quarter"
                value={
                  <span className={period.qtd >= 0 ? "text-steal" : "text-over"}>
                    {formatCurrency(period.qtd)}
                  </span>
                }
              />
              <Stat
                label="This year"
                value={
                  <span className={period.ytd >= 0 ? "text-steal" : "text-over"}>
                    {formatCurrency(period.ytd)}
                  </span>
                }
              />
            </div>
          )}

          {/* Profit by marketplace */}
          {mktRows.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Profit by marketplace</h2>
              <div className="space-y-2 rounded-2xl border border-border bg-surface/70 p-4">
                {mktRows.map(([name, v]) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-32 shrink-0 truncate text-sm">
                      {name}
                      <span className="ml-1 text-xs text-muted">({v.count})</span>
                    </div>
                    <div className="h-5 flex-1 overflow-hidden rounded-md bg-surface-2">
                      <div
                        className={`h-full rounded-md ${v.net >= 0 ? "bg-steal/60" : "bg-over/60"}`}
                        style={{ width: `${Math.max(6, (Math.abs(v.net) / maxMktNet) * 100)}%` }}
                      />
                    </div>
                    <div
                      className={`w-24 shrink-0 text-right text-sm font-semibold tabular-nums ${
                        v.net >= 0 ? "text-steal" : "text-over"
                      }`}
                    >
                      {formatCurrency(v.net)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

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
                  const ageDays = Math.floor(
                    (now.getTime() - (item.boughtAt ?? item.createdAt).getTime()) /
                      86400000
                  );
                  const aging = ageDays >= 60;
                  return (
                    <Link
                      key={item.id}
                      href={`/item/${item.id}`}
                      className={`flex items-center gap-3 rounded-xl border bg-surface/70 p-2.5 transition hover:border-brand/60 ${
                        aging ? "border-over/40" : "border-border"
                      }`}
                    >
                      <Thumb url={item.photos[0]?.url} name={item.name} />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted">
                          Cost {cost != null ? formatCurrency(cost) : "—"}
                          {projected != null && cost != null && (
                            <> · est. profit {formatCurrency(projected - cost)}</>
                          )}
                          {" · held "}
                          {ageDays}d
                          {item.storageLocation ? ` · ${item.storageLocation}` : ""}
                        </p>
                      </div>
                      {aging ? (
                        <span className="rounded-full bg-over/15 px-2.5 py-1 text-xs font-semibold text-over">
                          Consider markdown
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium capitalize text-muted">
                          {item.status}
                        </span>
                      )}
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
