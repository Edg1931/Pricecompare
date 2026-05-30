import type { Demand, ItemIdentification, PriceTrend, RawComp } from "@/lib/types";
import { identifyItem } from "@/lib/ai/vision";
import { researchPrices } from "@/lib/ai/research";
import { generateListing } from "@/lib/ai/listing";
import { searchEbay, searchEbaySold, hasEbay } from "@/lib/pricing/ebay";
import { aggregatePrices } from "@/lib/pricing/aggregate";
import { analyzeDeal } from "@/lib/analysis/deal";

export interface AnalysisResult {
  identification: ItemIdentification;
  comps: RawComp[];
  aggregate: ReturnType<typeof aggregatePrices>;
  deal: ReturnType<typeof analyzeDeal>;
  marketContext: string | null;
  trend: PriceTrend | null;
  demand: Demand | null;
  listing: { title: string; description: string } | null;
}

/**
 * Full analysis from a known identification onward. Used both for the initial
 * analyze and for re-analyze (which can skip vision).
 */
export async function priceAndAnalyze(
  identification: ItemIdentification,
  askingPrice: number | null
): Promise<AnalysisResult> {
  // Run pricing research and listing generation concurrently so the listing
  // doesn't add to the critical path (it would otherwise push us past
  // Vercel's 60s function limit). The listing only uses price for one
  // optional line, so it's fine to generate it without the median.
  const [ebayActive, ebaySold, research, listing] = await Promise.all([
    hasEbay() ? searchEbay(identification.searchQuery) : Promise.resolve([]),
    hasEbay() ? searchEbaySold(identification.searchQuery) : Promise.resolve([]),
    researchPrices(identification),
    generateListing(identification, null),
  ]);

  const comps = [...ebaySold, ...ebayActive, ...research.comps];
  const aggregate = aggregatePrices(comps);
  const deal = analyzeDeal(aggregate.median, askingPrice);

  return {
    identification,
    comps,
    aggregate,
    deal,
    marketContext: research.marketContext,
    trend: research.trend,
    demand: research.demand,
    listing,
  };
}

/** Identify from photos, then price and analyze. */
export async function analyzeFromImages(
  imageDataUrls: string[],
  askingPrice: number | null,
  userHint?: string
): Promise<AnalysisResult> {
  const identification = await identifyItem(imageDataUrls, userHint);
  return priceAndAnalyze(identification, askingPrice);
}
