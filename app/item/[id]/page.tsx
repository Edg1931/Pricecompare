import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { skuFor } from "@/lib/sku";
import {
  ArrowLeft,
  ExternalLink,
  Tag,
  TrendingUp,
  Trophy,
  Handshake,
  Search,
} from "lucide-react";
import {
  getItem,
  parseAttributes,
  parseNetProceeds,
  parsePriceTrend,
  parseDemand,
} from "@/lib/item";
import { sourcingMetrics, negotiation } from "@/lib/analysis/deal";
import { currentUserId } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { sourceMeta } from "@/lib/display";
import { marketplaceLinks, searchUrlForSource } from "@/lib/marketplaces";
import { buildCrossListings } from "@/lib/crosslist";
import type { Verdict } from "@/lib/types";
import {
  Card,
  VerdictBadge,
  StatusBadge,
  ConfidenceBar,
  SourcingCard,
  DemandCard,
} from "@/components/ui";
import { PriceGauge } from "@/components/PriceGauge";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { PriceHistoryCard } from "@/components/PriceHistory";
import { CrossListCard } from "@/components/CrossList";
import { CopyButton, ShareButton } from "@/components/Copyable";
import {
  AskingPriceEditor,
  ItemActions,
  EditDetailsButton,
  FlipTracker,
  NotesEditor,
  AlertControl,
  StorageEditor,
} from "@/components/ItemControls";
import { PrintLabelButton } from "@/components/PrintLabel";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await currentUserId();
  const item = await getItem(id, userId);
  if (!item) notFound();

  const attributes = parseAttributes(item.attributes);
  const netProceeds = parseNetProceeds(item.netProceeds);
  const subtitle = [item.brand, item.model].filter(Boolean).join(" · ");
  const sourcing = sourcingMetrics(
    item.recommendedMedian,
    item.askingPrice,
    netProceeds
  );
  const fullListing = [item.listingTitle, item.listingDescription]
    .filter(Boolean)
    .join("\n\n");
  const priceTrend = parsePriceTrend(item.priceTrend);
  const snapshots = item.snapshots.map((s) => ({
    median: s.median,
    createdAt: s.createdAt.toISOString(),
  }));
  const sku = skuFor(item.id);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const qrDataUrl = await QRCode.toDataURL(`${origin}/item/${item.id}`, {
    margin: 1,
    width: 240,
  });
  const market = marketplaceLinks(item.searchQuery ?? item.name);
  const crossListings = buildCrossListings({
    name: item.name,
    brand: item.brand,
    model: item.model,
    category: item.category,
    condition: item.condition,
    listingTitle: item.listingTitle,
    listingDescription: item.listingDescription,
    recommendedMedian: item.recommendedMedian,
    attributes,
  });
  const demand = parseDemand(item.demand);
  const neg =
    item.soldPrice == null &&
    item.status !== "bought" &&
    item.status !== "listed"
      ? negotiation(item.recommendedMedian, item.askingPrice)
      : null;

  // group comps by source
  const grouped = new Map<string, typeof item.comps>();
  for (const c of item.comps) {
    const arr = grouped.get(c.source) ?? [];
    arr.push(c);
    grouped.set(c.source, arr);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" /> Library
      </Link>

      <div className="grid gap-6 md:grid-cols-[minmax(0,360px)_1fr]">
        {/* Left: photos */}
        <div className="space-y-4">
          <PhotoCarousel photos={item.photos} />
          <div className="flex flex-wrap items-center gap-2">
            <ItemActions itemId={item.id} />
            <EditDetailsButton
              item={{
                id: item.id,
                name: item.name,
                brand: item.brand,
                model: item.model,
                category: item.category,
                condition: item.condition,
                searchQuery: item.searchQuery,
              }}
            />
            <ShareButton title={item.name} />
          </div>
          <Card className="p-4">
            <AlertControl
              itemId={item.id}
              alertTarget={item.alertTarget}
              alertDirection={item.alertDirection}
              triggered={item.alertTriggeredAt != null}
            />
          </Card>
          <Card className="p-4">
            <FlipTracker
              itemId={item.id}
              status={item.status}
              askingPrice={item.askingPrice}
              purchasePrice={item.purchasePrice}
              soldPrice={item.soldPrice}
              soldMarketplace={item.soldMarketplace}
              soldFees={item.soldFees}
              shippingCost={item.shippingCost}
              projectedNet={netProceeds[0]?.net ?? null}
              bestPlatform={item.bestPlatform}
            />
          </Card>
          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted">
                Storage &amp; label
              </span>
              <span className="font-mono text-xs text-muted">{sku}</span>
            </div>
            <StorageEditor itemId={item.id} initial={item.storageLocation} />
            <PrintLabelButton
              qrDataUrl={qrDataUrl}
              sku={sku}
              name={item.name}
              price={formatCurrency(item.recommendedMedian ?? item.askingPrice)}
              location={item.storageLocation}
            />
          </Card>
        </div>

        {/* Right: details */}
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <VerdictBadge verdict={item.verdict as Verdict | null} />
              <StatusBadge status={item.status} />
              {item.category && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">
                  <Tag className="h-3 w-3" /> {item.category}
                </span>
              )}
              {item.condition && (
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">
                  {item.condition}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight">
              {item.name}
            </h1>
            {subtitle && <p className="text-muted">{subtitle}</p>}
          </div>

          {/* Deal hero */}
          <Card className="p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted">
                  Asking price
                </div>
                <AskingPriceEditor itemId={item.id} initial={item.askingPrice} />
              </div>
              {item.dealScore !== null && (
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-muted">
                    Deal score
                  </div>
                  <div className="text-3xl font-bold tabular-nums">
                    {item.dealScore}
                    <span className="text-base text-muted">/100</span>
                  </div>
                </div>
              )}
            </div>

            {item.recommendedMedian !== null && (
              <div className="mt-5">
                <PriceGauge
                  low={item.recommendedLow}
                  median={item.recommendedMedian}
                  high={item.recommendedHigh}
                  asking={item.askingPrice}
                />
              </div>
            )}

            {item.analysisSummary && (
              <p className="mt-4 text-sm leading-relaxed text-fg/90">
                {item.analysisSummary}
              </p>
            )}
          </Card>

          {/* Confidence */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <ConfidenceBar value={item.identConfidence} label="ID confidence" />
            </Card>
            <Card className="p-4">
              <ConfidenceBar value={item.priceConfidence} label="Price confidence" />
            </Card>
          </div>
        </div>
      </div>

      {/* Sourcing / ROI */}
      {sourcing && <SourcingCard metrics={sourcing} />}

      {/* Negotiation assistant */}
      {neg && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Handshake className="h-4 w-4 text-accent" />
            <h2 className="font-semibold">Negotiation assistant</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-surface-2/50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted">
                Opening offer
              </div>
              <div className="mt-0.5 text-xl font-semibold tabular-nums">
                {formatCurrency(neg.opening)}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface-2/50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted">
                Walk-away max
              </div>
              <div className="mt-0.5 text-xl font-semibold tabular-nums">
                {formatCurrency(neg.maxBuy)}
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-surface-2 px-3 py-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted">Script</span>
              <CopyButton text={neg.script} />
            </div>
            <p className="text-sm leading-relaxed text-fg/90">{neg.script}</p>
          </div>
        </Card>
      )}

      {/* Demand & sell-through */}
      {demand && <DemandCard demand={demand} />}

      {/* Price history & trend */}
      <PriceHistoryCard trend={priceTrend} snapshots={snapshots} />

      {/* Best platform + net proceeds */}
      {netProceeds.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-fair" />
            <h2 className="font-semibold">Where to sell it</h2>
            {item.bestPlatform && (
              <span className="ml-auto rounded-full bg-steal/15 px-2.5 py-1 text-xs font-semibold text-steal">
                Best: {item.bestPlatform}
              </span>
            )}
          </div>
          <p className="mb-4 text-xs text-muted">
            Estimated take-home at the median resale price of{" "}
            {formatCurrency(item.recommendedMedian)} (after typical seller fees).
          </p>
          <div className="space-y-2">
            {netProceeds.map((p) => {
              const max = netProceeds[0].net || 1;
              return (
                <div key={p.platform} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 text-sm">{p.platform}</div>
                  <div className="h-6 flex-1 overflow-hidden rounded-md bg-surface-2">
                    <div
                      className="h-full rounded-md bg-gradient-to-r from-brand/70 to-accent/70"
                      style={{ width: `${Math.max(8, (p.net / max) * 100)}%` }}
                    />
                  </div>
                  <div className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {formatCurrency(p.net)}
                  </div>
                  <div className="hidden w-14 shrink-0 text-right text-xs text-muted sm:block">
                    {Math.round(p.feePct * 100)}% fee
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Listing kit */}
      {(item.listingTitle || item.listingDescription) && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <h2 className="font-semibold">Ready-to-post listing</h2>
            {fullListing && (
              <span className="ml-auto">
                <CopyButton text={fullListing} label="Copy all" />
              </span>
            )}
          </div>
          {item.listingTitle && (
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-muted">Title</span>
                <CopyButton text={item.listingTitle} />
              </div>
              <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm font-medium">
                {item.listingTitle}
              </p>
            </div>
          )}
          {item.listingDescription && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-muted">
                  Description
                </span>
                <CopyButton text={item.listingDescription} />
              </div>
              <p className="whitespace-pre-wrap rounded-lg bg-surface-2 px-3 py-2 text-sm leading-relaxed text-fg/90">
                {item.listingDescription}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Cross-list drafts */}
      <CrossListCard listings={crossListings} />

      {/* Comparable listings */}
      <Card className="p-5">
        <h2 className="mb-1 font-semibold">
          Comparable listings{" "}
          <span className="text-muted">({item.comps.length})</span>
        </h2>
        {item.comps.length > 0 && (
          <p className="mb-1 text-xs text-muted">
            Prices captured {item.updatedAt.toLocaleDateString()} — live listings may
            have changed since. Re-analyze for the latest.
          </p>
        )}
        {item.marketContext && (
          <p className="mb-4 text-sm text-muted">{item.marketContext}</p>
        )}
        {item.comps.length === 0 ? (
          <p className="text-sm text-muted">
            No comparable listings found. Try re-analyzing or add a hint.
          </p>
        ) : (
          <div className="space-y-4">
            {[...grouped.entries()].map(([source, comps]) => {
              const meta = sourceMeta(source);
              return (
                <div key={source}>
                  <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    {meta.label}
                    <span className="text-xs text-muted">({comps.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {comps.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2"
                      >
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(c.price, c.currency)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-muted">
                          {c.title}
                        </span>
                        {c.listingType === "sold" && (
                          <span className="rounded bg-steal/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-steal">
                            sold
                          </span>
                        )}
                        {c.url ? (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View this listing"
                            className="text-muted transition hover:text-brand"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <a
                            href={searchUrlForSource(
                              c.source,
                              c.title || item.searchQuery || item.name
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="No direct link — opens recent/sold listings for this item"
                            className="inline-flex items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted transition hover:text-brand"
                          >
                            <Search className="h-3 w-3" /> search
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Check the market */}
      {market.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-1 font-semibold">Check the market yourself</h2>
          <p className="mb-3 text-sm text-muted">
            Open a live search for &ldquo;{item.searchQuery ?? item.name}&rdquo; to
            verify prices or list it.
          </p>
          <div className="flex flex-wrap gap-2">
            {market.map((m) => (
              <a
                key={m.label}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium transition hover:border-brand hover:text-brand"
              >
                <span className={`h-2 w-2 rounded-full ${m.dot}`} />
                {m.label}
                <ExternalLink className="h-3.5 w-3.5 text-muted" />
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Notes */}
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Notes</h2>
        <NotesEditor itemId={item.id} initial={item.notes} />
      </Card>

      {/* Attributes */}
      {attributes.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Details</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {attributes.map((a, i) => (
              <div key={i}>
                <dt className="text-xs uppercase tracking-wide text-muted">{a.label}</dt>
                <dd className="font-medium">{a.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </div>
  );
}
