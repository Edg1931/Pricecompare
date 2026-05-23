import type { ItemIdentification, RawComp } from "@/lib/types";
import { identifyItem } from "@/lib/ai/vision";
import { researchPrices } from "@/lib/ai/research";
import { generateListing } from "@/lib/ai/listing";
import { searchEbay, hasEbay } from "@/lib/pricing/ebay";
import { aggregatePrices } from "@/lib/pricing/aggregate";
import { analyzeDeal } from "@/lib/analysis/deal";

export interface AnalysisResult {
  identification: ItemIdentification;
  comps: RawComp[];
  aggregate: ReturnType<typeof aggregatePrices>;
  deal: ReturnType<typeof analyzeDeal>;
  marketContext: string | null;
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
  const [ebayComps, research] = await Promise.all([
    hasEbay() ? searchEbay(identification.searchQuery) : Promise.resolve([]),
    researchPrices(identification),
  ]);

  const comps = [...ebayComps, ...research.comps];
  const aggregate = aggregatePrices(comps);
  const deal = analyzeDeal(aggregate.median, askingPrice);
  const listing = await generateListing(identification, aggregate.median);

  return {
    identification,
    comps,
    aggregate,
    deal,
    marketContext: research.marketContext,
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
