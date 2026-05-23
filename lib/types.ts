export type CompSource =
  | "ebay"
  | "etsy"
  | "mercari"
  | "facebook"
  | "swappa"
  | "poshmark"
  | "stockx"
  | "web";

export interface RawComp {
  source: CompSource;
  title: string;
  price: number;
  currency?: string;
  url?: string | null;
  condition?: string | null;
  listingType?: "active" | "sold";
}

export interface ItemIdentification {
  name: string;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  condition?: string | null;
  conditionNotes?: string | null;
  attributes: { label: string; value: string }[];
  searchQuery: string;
  confidence: number; // 0..1
  reasoning?: string | null;
}

export interface PriceAggregate {
  low: number | null;
  median: number | null;
  high: number | null;
  confidence: number; // 0..1
  sampleSize: number;
  bySource: Record<string, { count: number; median: number }>;
}

export type Verdict = "STEAL" | "GOOD" | "FAIR" | "OVERPRICED";

export interface PlatformNet {
  platform: string;
  net: number;
  feePct: number;
}

export interface DealAnalysis {
  dealScore: number | null; // 0..100
  verdict: Verdict | null;
  netProceeds: PlatformNet[];
  bestPlatform: string | null;
  estimatedProfit: number | null;
  summary: string;
}

export interface ListingKit {
  title: string;
  description: string;
}

export interface PriceTrend {
  current: number | null; // typical median sold price now
  m3: number | null; // ~3 months ago
  m6: number | null; // ~6 months ago
  y1: number | null; // ~1 year ago
  direction: "rising" | "stable" | "falling" | null;
  note: string | null;
}

export interface Demand {
  sellThroughScore: number | null; // 0..100, how likely/quickly it sells
  daysToSell: string | null; // e.g. "1-2 weeks"
  seasonality: string | null; // best time of year to sell
  note: string | null; // short demand summary
}

export interface Negotiation {
  maxBuy: number; // pay under this for a healthy flip
  opening: number; // suggested opening offer
  script: string; // a line to use with the seller
}

export interface SourcingMetrics {
  bestPlatform: string | null;
  bestNet: number; // take-home at median sale price, best platform
  profit: number; // bestNet - asking
  roiPct: number; // profit / asking * 100
  breakEvenSell: number; // sale price needed to recoup the asking price after fees
  recommendation: "BUY" | "CONSIDER" | "PASS";
}
