import type {
  DealAnalysis,
  Negotiation,
  PlatformNet,
  SourcingMetrics,
  Verdict,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

/**
 * Suggests a buying ceiling, an opening offer, and a script for negotiating a
 * purchase, based on the market median and the seller's asking price.
 */
export function negotiation(
  median: number | null,
  askingPrice: number | null
): Negotiation | null {
  if (!median) return null;
  const round5 = (n: number) => Math.max(1, Math.round(n / 5) * 5);
  const maxBuy = round5(median * 0.6);
  let opening = round5(median * 0.45);
  if (askingPrice != null) opening = Math.min(opening, round5(askingPrice * 0.8));
  opening = Math.min(opening, maxBuy);
  const script = `These tend to sell for around ${formatCurrency(
    median
  )}. After fees and the work to resell it, I could do ${formatCurrency(
    opening
  )} today — would that work?`;
  return { maxBuy, opening, script };
}

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

/** Marketplaces the user can pick when recording a sale. */
export const MARKETPLACES = [
  ...PLATFORM_FEES.map((p) => p.platform),
  "Other / local",
];

/** Estimated platform fee for a sale at the given price on a marketplace. */
export function marketplaceFee(
  marketplace: string | null | undefined,
  salePrice: number
): number {
  if (!marketplace) return 0;
  const fee = PLATFORM_FEES.find(
    (p) => p.platform.toLowerCase() === marketplace.toLowerCase()
  );
  if (!fee) return 0;
  return Math.round((salePrice * fee.pct + fee.fixed) * 100) / 100;
}

export interface RealizedPnL {
  revenue: number;
  cost: number; // what you paid for the item
  fees: number; // platform fees
  shipping: number;
  net: number; // realized profit/loss
}

/** Realized profit/loss for a sold item, or null if it hasn't sold. */
export function realizedPnL(opts: {
  purchasePrice: number | null;
  soldPrice: number | null;
  soldMarketplace: string | null;
  shippingCost: number | null;
  feesOverride?: number | null;
}): RealizedPnL | null {
  if (opts.soldPrice == null) return null;
  const revenue = opts.soldPrice;
  const cost = opts.purchasePrice ?? 0;
  const fees =
    opts.feesOverride != null
      ? opts.feesOverride
      : marketplaceFee(opts.soldMarketplace, revenue);
  const shipping = opts.shippingCost ?? 0;
  const net = Math.round((revenue - cost - fees - shipping) * 100) / 100;
  return { revenue, cost, fees, shipping, net };
}

export function computeNetProceeds(salePrice: number): PlatformNet[] {
  return PLATFORM_FEES.map(({ platform, pct, fixed }) => ({
    platform,
    feePct: pct,
    net: Math.max(0, Math.round((salePrice * (1 - pct) - fixed) * 100) / 100),
  })).sort((a, b) => b.net - a.net);
}

/**
 * Sourcing math for buyers: ROI, break-even resale price, and a buy/pass call.
 * Returns null when there isn't enough data (no median or no asking price).
 */
export function sourcingMetrics(
  median: number | null,
  askingPrice: number | null,
  netProceeds: PlatformNet[]
): SourcingMetrics | null {
  if (!median || !askingPrice || askingPrice <= 0) return null;
  const best = netProceeds[0] ?? null;
  const bestNet = best?.net ?? median;
  const feePct = best?.feePct ?? 0;
  const profit = Math.round((bestNet - askingPrice) * 100) / 100;
  const roiPct = Math.round((profit / askingPrice) * 1000) / 10;
  // Sale price whose take-home (after the best platform's fee) equals the buy price.
  const breakEvenSell = Math.round((askingPrice / (1 - feePct)) * 100) / 100;
  const ratio = askingPrice / median;
  const recommendation: SourcingMetrics["recommendation"] =
    ratio <= 0.85 ? "BUY" : ratio <= 1.1 ? "CONSIDER" : "PASS";
  return {
    bestPlatform: best?.platform ?? null,
    bestNet,
    profit,
    roiPct,
    breakEvenSell,
    recommendation,
  };
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
