import Link from "next/link";
import { Bell, BellRing, ArrowRight, Package } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { DismissAlertButton } from "@/components/ItemControls";

export const dynamic = "force-dynamic";

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

export default async function AlertsPage() {
  const watched = await prisma.item.findMany({
    where: { alertTarget: { not: null }, soldPrice: null },
    orderBy: [{ alertTriggeredAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
    include: { photos: { orderBy: { order: "asc" }, take: 1 } },
  });

  const triggered = watched.filter((i) => i.alertTriggeredAt);
  const watching = watched.filter((i) => !i.alertTriggeredAt);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Bell className="h-6 w-6 text-brand" /> Price alerts
        </h1>
        <p className="text-sm text-muted">
          Set a target on any item; we re-check watched items daily and flag the
          ones that cross it. (Re-analyzing an item checks its alert immediately.)
        </p>
      </div>

      {watched.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-2xl border border-border bg-surface/70 p-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2">
            <Bell className="h-7 w-7 text-muted" />
          </div>
          <div>
            <p className="font-medium">No price alerts yet</p>
            <p className="text-sm text-muted">
              Open an item and tap <span className="font-medium">Set a price alert</span>.
            </p>
          </div>
        </div>
      ) : (
        <>
          {triggered.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <BellRing className="h-5 w-5 text-steal" /> Triggered ({triggered.length})
              </h2>
              <div className="space-y-2">
                {triggered.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-steal/40 bg-surface/70 p-2.5"
                  >
                    <Thumb url={item.photos[0]?.url} name={item.name} />
                    <Link href={`/item/${item.id}`} className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-steal">
                        Now {formatCurrency(item.recommendedMedian)} · target{" "}
                        {item.alertDirection === "above" ? "≥" : "≤"}{" "}
                        {formatCurrency(item.alertTarget)}
                      </p>
                    </Link>
                    <DismissAlertButton itemId={item.id} />
                    <Link
                      href={`/item/${item.id}`}
                      className="shrink-0 rounded-lg border border-border bg-surface-2 p-2 text-muted transition hover:text-brand"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {watching.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">
                Watching <span className="text-sm font-normal text-muted">({watching.length})</span>
              </h2>
              <div className="space-y-2">
                {watching.map((item) => (
                  <Link
                    key={item.id}
                    href={`/item/${item.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface/70 p-2.5 transition hover:border-brand/60"
                  >
                    <Thumb url={item.photos[0]?.url} name={item.name} />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted">
                        Now {formatCurrency(item.recommendedMedian)} · alert{" "}
                        {item.alertDirection === "above" ? "≥" : "≤"}{" "}
                        {formatCurrency(item.alertTarget)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
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
