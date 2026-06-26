import type { Demand, ItemIdentification, PriceTrend, RawComp } from "@/lib/types";
import { identifyItem } from "@/lib/ai/vision";
import { researchPrices } from "@/lib/ai/research";
import { generateListing } from "@/lib/ai/listing";
import { searchEbay, searchEbaySold, hasEbay } from "@/lib/pricing/ebay";
import { searchGoogleShopping } from "@/lib/pricing/google";
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
  // Use allSettled so a failure in one source (e.g. Anthropic timeout, eBay
  // scope not approved) doesn't abort the whole analysis.
  const settled = await Promise.allSettled([
    hasEbay() ? searchEbay(identification.searchQuery) : Promise.resolve([]),
    hasEbay() ? searchEbaySold(identification.searchQuery) : Promise.resolve([]),
    searchGoogleShopping(identification.searchQuery, 10),
    researchPrices(identification),
    generateListing(identification, null),
  ]);
  const [ebayActiveR, ebaySoldR, googleCompsR, researchR, listingR] = settled;
  const ebayActive  = ebayActiveR.status  === "fulfilled" ? ebayActiveR.value  : [];
  const ebaySold    = ebaySoldR.status    === "fulfilled" ? ebaySoldR.value    : [];
  const googleComps = googleCompsR.status === "fulfilled" ? googleCompsR.value : [];
  const research    = researchR.status    === "fulfilled"
    ? researchR.value
    : { comps: [], marketContext: null, trend: null, demand: null };
  const listing     = listingR.status     === "fulfilled" ? listingR.value     : null;
  if (researchR.status === "rejected")  console.error("Research failed:",  researchR.reason);
  if (listingR.status  === "rejected")  console.error("Listing gen failed:", listingR.reason);

  const comps = [...ebaySold, ...ebayActive, ...googleComps, ...research.comps];
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
