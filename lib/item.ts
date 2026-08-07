import { prisma } from "@/lib/db";
import { savePhotos } from "@/lib/storage";
import type { AnalysisResult } from "@/lib/analysis/pipeline";
import type { Demand, PlatformNet, PriceTrend } from "@/lib/types";

/** Create an Item row (+photos +comps) from an analysis result. */
export async function persistAnalysis(
  result: AnalysisResult,
  opts: {
    imageDataUrls: string[];
    askingPrice: number | null;
    notes?: string | null;
    userId?: string | null;
  }
) {
  const { identification: id, aggregate, deal } = result;

  const item = await prisma.item.create({
    data: {
      userId: opts.userId ?? null,
      name: id.name,
      brand: id.brand,
      model: id.model,
      category: id.category,
      condition: id.condition,
      attributes: JSON.stringify(id.attributes ?? []),
      identConfidence: id.confidence,
      identNotes: id.reasoning,
      searchQuery: id.searchQuery,
      recommendedLow: aggregate.low,
      recommendedMedian: aggregate.median,
      recommendedHigh: aggregate.high,
      priceConfidence: aggregate.confidence,
      sampleSize: aggregate.sampleSize,
      marketContext: result.marketContext,
      retailPrice: result.retail?.price ?? null,
      retailNote: result.retail?.note ?? null,
      bySource: JSON.stringify(aggregate.bySource),
      askingPrice: opts.askingPrice,
      dealScore: deal.dealScore,
      verdict: deal.verdict,
      bestPlatform: deal.bestPlatform,
      netProceeds: JSON.stringify(deal.netProceeds),
      analysisSummary: deal.summary,
      listingTitle: result.listing?.title ?? null,
      listingDescription: result.listing?.description ?? null,
      priceTrend: result.trend ? JSON.stringify(result.trend) : null,
      demand: result.demand ? JSON.stringify(result.demand) : null,
      notes: opts.notes ?? null,
      snapshots: {
        create: [
          {
            low: aggregate.low,
            median: aggregate.median,
            high: aggregate.high,
            sampleSize: aggregate.sampleSize,
          },
        ],
      },
      comps: {
        create: result.comps.map((c) => ({
          source: c.source,
          title: c.title,
          price: c.price,
          currency: c.currency ?? "USD",
          url: c.url ?? null,
          imageUrl: c.imageUrl ?? null,
          condition: c.condition ?? null,
          listingType: c.listingType ?? "active",
        })),
      },
    },
  });

  // Save photos using the item id, then attach. If photo storage fails, keep
  // the item anyway: the analysis (the expensive part) succeeded, and failing
  // the request here would make the user retry and double-spend on AI.
  try {
    const urls = await savePhotos(item.id, opts.imageDataUrls);
    await prisma.photo.createMany({
      data: urls.map((url, order) => ({ itemId: item.id, url, order })),
    });
  } catch (err) {
    console.error(`Photo save failed for item ${item.id} (analysis kept):`, err);
  }

  return item.id;
}

export type ItemWithRelations = NonNullable<
  Awaited<ReturnType<typeof getItem>>
>;

export async function getItem(id: string, userId: string | null = null) {
  const item = await prisma.item.findFirst({
    where: { id, ...(userId ? { userId } : {}) },
    include: {
      photos: { orderBy: { order: "asc" } },
      comps: { orderBy: { price: "asc" } },
      // Watched items gain snapshots on every cron reprice — cap the load and
      // keep the most recent ones (reversed back to ascending for the chart).
      snapshots: { orderBy: { createdAt: "desc" }, take: 120 },
    },
  });
  item?.snapshots.reverse();
  return item;
}

export function parseAttributes(json: string | null): { label: string; value: string }[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseBySource(
  json: string | null
): Record<string, { count: number; median: number }> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, { count: number; median: number }>)
      : {};
  } catch {
    return {};
  }
}

export function parseNetProceeds(json: string | null): PlatformNet[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parsePriceTrend(json: string | null): PriceTrend | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as PriceTrend) : null;
  } catch {
    return null;
  }
}

export function parseDemand(json: string | null): Demand | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as Demand) : null;
  } catch {
    return null;
  }
}
