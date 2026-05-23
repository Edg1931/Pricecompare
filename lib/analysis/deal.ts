import type { DealAnalysis, PlatformNet, Verdict } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

/** Approximate seller fee models per platform (estimates; fees change over time). */
const PLATFORM_FEES: { platform: string; pct: number; fixed: number }[] = [
  { platform: "eBay", pct: 0.1325, fixed: 0.3 },
  { platform: "Etsy", pct: 0.09, fixed: 0.2 },
  { platform: "Mercari", pct: 0.129, fixed: 0.5 },
  { platform: "Poshmark", pct: 0.2, fixed: 0 },
  { platform: "StockX", pct: 0.1, fixed: 0 },
  { platform: "Swappa", pct: 0.03, fixed: 0 },
  { platform: "Facebook Marketplace", pct: 0.0, fixed: 0 }, // local pickup
];

export function computeNetProceeds(salePrice: number): PlatformNet[] {
  return PLATFORM_FEES.map(({ platform, pct, fixed }) => ({
    platform,
    feePct: pct,
    net: Math.max(0, Math.round((salePrice * (1 - pct) - fixed) * 100) / 100),
  })).sort((a, b) => b.net - a.net);
}

function verdictFor(ratio: number): Verdict {
  if (ratio <= 0.6) return "STEAL";
  if (ratio <= 0.85) return "GOOD";
  if (ratio <= 1.1) return "FAIR";
  return "OVERPRICED";
}

export function analyzeDeal(
  median: number | null,
  askingPrice: number | null
): DealAnalysis {
  const netProceeds = median ? computeNetProceeds(median) : [];
  const bestPlatform = netProceeds[0]?.platform ?? null;

  if (!median) {
    return {
      dealScore: null,
      verdict: null,
      netProceeds,
      bestPlatform,
      estimatedProfit: null,
      summary: "Not enough market data to estimate a resale price.",
    };
  }

  if (askingPrice === null || askingPrice === undefined) {
    return {
      dealScore: null,
      verdict: null,
      netProceeds,
      bestPlatform,
      estimatedProfit: null,
      summary: `Estimated resale value around ${formatCurrency(
        median
      )}. Add an asking price to score the deal.`,
    };
  }

  const ratio = askingPrice / median;
  const verdict = verdictFor(ratio);
  // Score: 50 at market median, 100 at half price, 0 at 1.5x.
  const dealScore = Math.max(0, Math.min(100, Math.round((1 - ratio) * 100 + 50)));

  const bestNet = netProceeds[0]?.net ?? median;
  const estimatedProfit = Math.round((bestNet - askingPrice) * 100) / 100;

  const summary =
    verdict === "STEAL"
      ? `Excellent deal — priced ${Math.round(
          (1 - ratio) * 100
        )}% below market. Reselling on ${bestPlatform} nets ~${formatCurrency(
          bestNet
        )} for an estimated ${formatCurrency(estimatedProfit)} profit.`
      : verdict === "GOOD"
        ? `Solid buy below market value. Best resale on ${bestPlatform} nets ~${formatCurrency(
            bestNet
          )} (est. profit ${formatCurrency(estimatedProfit)}).`
        : verdict === "FAIR"
          ? `Priced near market value (${formatCurrency(
              median
            )}). Limited resale upside after fees.`
          : `Priced above market value of ${formatCurrency(
              median
            )} — likely not worth flipping at this price.`;

  return { dealScore, verdict, netProceeds, bestPlatform, estimatedProfit, summary };
}
