import { prisma } from "@/lib/db";
import { savePhotos } from "@/lib/storage";
import type { AnalysisResult } from "@/lib/analysis/pipeline";
import type { PlatformNet } from "@/lib/types";

/** Create an Item row (+photos +comps) from an analysis result. */
export async function persistAnalysis(
  result: AnalysisResult,
  opts: { imageDataUrls: string[]; askingPrice: number | null; notes?: string | null }
) {
  const { identification: id, aggregate, deal } = result;

  const item = await prisma.item.create({
    data: {
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
      askingPrice: opts.askingPrice,
      dealScore: deal.dealScore,
      verdict: deal.verdict,
      bestPlatform: deal.bestPlatform,
      netProceeds: JSON.stringify(deal.netProceeds),
      analysisSummary: deal.summary,
      listingTitle: result.listing?.title ?? null,
      listingDescription: result.listing?.description ?? null,
      notes: opts.notes ?? null,
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
    },
  });

  // Save photos using the item id, then attach.
  const urls = await savePhotos(item.id, opts.imageDataUrls);
  await prisma.photo.createMany({
    data: urls.map((url, order) => ({ itemId: item.id, url, order })),
  });

  return item.id;
}

export type ItemWithRelations = NonNullable<
  Awaited<ReturnType<typeof getItem>>
>;

export async function getItem(id: string) {
  return prisma.item.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { order: "asc" } },
      comps: { orderBy: { price: "asc" } },
    },
  });
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

export function parseNetProceeds(json: string | null): PlatformNet[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
