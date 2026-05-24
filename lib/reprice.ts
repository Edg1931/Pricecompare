import { prisma } from "@/lib/db";
import { priceAndAnalyze } from "@/lib/analysis/pipeline";
import { parseAttributes } from "@/lib/item";
import type { ItemIdentification } from "@/lib/types";

/**
 * Re-runs pricing for an existing item (no vision), refreshes all pricing
 * fields, records a price snapshot, and evaluates any price alert. Shared by
 * the manual re-analyze route and the scheduled re-check cron.
 *
 * Returns the new median, or null if the item no longer exists.
 */
export async function repriceItem(id: string): Promise<{ median: number | null } | null> {
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) return null;

  const ident: ItemIdentification = {
    name: item.name,
    brand: item.brand,
    model: item.model,
    category: item.category,
    condition: item.condition,
    conditionNotes: null,
    attributes: parseAttributes(item.attributes),
    searchQuery: item.searchQuery ?? item.name,
    confidence: item.identConfidence ?? 0.5,
    reasoning: item.identNotes,
  };

  const result = await priceAndAnalyze(ident, item.askingPrice);
  const median = result.aggregate.median;

  // Trip the alert if the fresh median crosses the target.
  let alertUpdate = {};
  if (item.alertTarget != null && median != null && !item.alertTriggeredAt) {
    const hit =
      item.alertDirection === "above"
        ? median >= item.alertTarget
        : median <= item.alertTarget;
    if (hit) alertUpdate = { alertTriggeredAt: new Date() };
  }

  await prisma.comp.deleteMany({ where: { itemId: id } });
  await prisma.item.update({
    where: { id },
    data: {
      recommendedLow: result.aggregate.low,
      recommendedMedian: median,
      recommendedHigh: result.aggregate.high,
      priceConfidence: result.aggregate.confidence,
      sampleSize: result.aggregate.sampleSize,
      marketContext: result.marketContext,
      priceTrend: result.trend ? JSON.stringify(result.trend) : item.priceTrend,
      demand: result.demand ? JSON.stringify(result.demand) : item.demand,
      dealScore: result.deal.dealScore,
      verdict: result.deal.verdict,
      bestPlatform: result.deal.bestPlatform,
      netProceeds: JSON.stringify(result.deal.netProceeds),
      analysisSummary: result.deal.summary,
      listingTitle: result.listing?.title ?? item.listingTitle,
      listingDescription: result.listing?.description ?? item.listingDescription,
      ...alertUpdate,
      comps: {
        create: result.comps.map((c) => ({
          source: c.source,
          title: c.title,
          price: c.price,
          currency: c.currency ?? "USD",
          url: c.url ?? null,
          condition: c.condition ?? null,
          listingType: c.listingType ?? "active",
        })),
      },
      snapshots: {
        create: [
          {
            low: result.aggregate.low,
            median,
            high: result.aggregate.high,
            sampleSize: result.aggregate.sampleSize,
          },
        ],
      },
    },
  });

  return { median };
}
