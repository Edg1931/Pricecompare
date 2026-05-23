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

/** Reject outliers using the 1.5*IQR rule, then summarize. */
export function aggregatePrices(comps: RawComp[]): PriceAggregate {
  const prices = comps
    .map((c) => c.price)
    .filter((p) => Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) {
    return { low: null, median: null, high: null, confidence: 0, sampleSize: 0, bySource: {} };
  }

  const q1 = percentile(prices, 0.25);
  const q3 = percentile(prices, 0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const filtered =
    prices.length >= 4 ? prices.filter((p) => p >= lowerBound && p <= upperBound) : prices;
  const used = filtered.length > 0 ? filtered : prices;

  const median = percentile(used, 0.5);
  const low = percentile(used, 0.1);
  const high = percentile(used, 0.9);

  // Per-source breakdown.
  const bySource: Record<string, { count: number; median: number }> = {};
  const grouped: Record<string, number[]> = {};
  for (const c of comps) {
    (grouped[c.source] ??= []).push(c.price);
  }
  for (const [source, arr] of Object.entries(grouped)) {
    const s = [...arr].sort((a, b) => a - b);
    bySource[source] = { count: s.length, median: percentile(s, 0.5) };
  }

  // Confidence: more comps, more source diversity, and tighter spread => higher.
  const sampleScore = Math.min(used.length / 10, 1); // saturates at 10 comps
  const sourceScore = Math.min(Object.keys(grouped).length / 3, 1);
  const spread = median > 0 ? (high - low) / median : 1;
  const spreadScore = Math.max(0, 1 - Math.min(spread, 1));
  const confidence =
    Math.round((sampleScore * 0.45 + sourceScore * 0.25 + spreadScore * 0.3) * 100) / 100;

  return {
    low: Math.round(low * 100) / 100,
    median: Math.round(median * 100) / 100,
    high: Math.round(high * 100) / 100,
    confidence,
    sampleSize: used.length,
    bySource,
  };
}
