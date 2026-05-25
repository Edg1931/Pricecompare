import type { PriceAggregate, RawComp } from "@/lib/types";

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Reject outliers using the 1.5*IQR rule, weight sold comps higher, then summarize. */
export function aggregatePrices(comps: RawComp[]): PriceAggregate {
  const valid = comps.filter((c) => Number.isFinite(c.price) && c.price > 0);

  if (valid.length === 0) {
    return { low: null, median: null, high: null, confidence: 0, sampleSize: 0, bySource: {} };
  }

  const prices = valid.map((c) => c.price).sort((a, b) => a - b);
  const q1 = percentile(prices, 0.25);
  const q3 = percentile(prices, 0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const inRange = (p: number) =>
    prices.length >= 4 ? p >= lowerBound && p <= upperBound : true;
  const used = valid.filter((c) => inRange(c.price));
  const usedComps = used.length > 0 ? used : valid;

  // Sold comps are the truest signal of resale value, so weight them more
  // heavily when computing the price range.
  const SOLD_WEIGHT = 2;
  const weighted: number[] = [];
  for (const c of usedComps) {
    const w = c.listingType === "sold" ? SOLD_WEIGHT : 1;
    for (let i = 0; i < w; i++) weighted.push(c.price);
  }
  weighted.sort((a, b) => a - b);

  const median = percentile(weighted, 0.5);
  const low = percentile(weighted, 0.1);
  const high = percentile(weighted, 0.9);

  // Per-source breakdown (real comp counts, not weighted).
  const bySource: Record<string, { count: number; median: number }> = {};
  const grouped: Record<string, number[]> = {};
  for (const c of usedComps) {
    (grouped[c.source] ??= []).push(c.price);
  }
  for (const [source, arr] of Object.entries(grouped)) {
    const s = [...arr].sort((a, b) => a - b);
    bySource[source] = { count: s.length, median: percentile(s, 0.5) };
  }

  const soldCount = usedComps.filter((c) => c.listingType === "sold").length;

  // Confidence: more comps, more source diversity, tighter spread, and a bonus
  // when we have real sold comps => higher.
  const sampleScore = Math.min(usedComps.length / 10, 1);
  const sourceScore = Math.min(Object.keys(grouped).length / 3, 1);
  const spread = median > 0 ? (high - low) / median : 1;
  const spreadScore = Math.max(0, 1 - Math.min(spread, 1));
  const soldBonus = soldCount >= 3 ? 0.1 : soldCount > 0 ? 0.05 : 0;
  const confidence =
    Math.round(
      Math.min(1, sampleScore * 0.4 + sourceScore * 0.25 + spreadScore * 0.3 + soldBonus) * 100
    ) / 100;

  return {
    low: Math.round(low * 100) / 100,
    median: Math.round(median * 100) / 100,
    high: Math.round(high * 100) / 100,
    confidence,
    sampleSize: usedComps.length,
    bySource,
  };
}
