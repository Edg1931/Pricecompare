import type { Verdict } from "@/lib/types";

export const VERDICT_META: Record<
  Verdict,
  { label: string; color: string; bg: string; emoji: string }
> = {
  STEAL: { label: "Steal", color: "text-steal", bg: "bg-steal/15", emoji: "🔥" },
  GOOD: { label: "Good deal", color: "text-good", bg: "bg-good/15", emoji: "👍" },
  FAIR: { label: "Fair price", color: "text-fair", bg: "bg-fair/15", emoji: "⚖️" },
  OVERPRICED: { label: "Overpriced", color: "text-over", bg: "bg-over/15", emoji: "⛔" },
};

export type ItemStatus = "analyzed" | "watching" | "bought" | "listed" | "sold";

export const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  analyzed: { label: "Analyzed", color: "text-muted", bg: "bg-surface-2" },
  watching: { label: "Watching", color: "text-accent", bg: "bg-accent/15" },
  bought: { label: "Bought", color: "text-brand", bg: "bg-brand/15" },
  listed: { label: "Listed", color: "text-fair", bg: "bg-fair/15" },
  sold: { label: "Sold", color: "text-steal", bg: "bg-steal/15" },
};

export const STATUS_OPTIONS: ItemStatus[] = [
  "analyzed",
  "watching",
  "bought",
  "listed",
  "sold",
];

export function statusMeta(status: string | null) {
  return STATUS_META[status ?? "analyzed"] ?? STATUS_META.analyzed;
}

export const SOURCE_META: Record<string, { label: string; dot: string }> = {
  ebay: { label: "eBay", dot: "bg-blue-400" },
  etsy: { label: "Etsy", dot: "bg-orange-400" },
  mercari: { label: "Mercari", dot: "bg-rose-400" },
  facebook: { label: "Facebook", dot: "bg-sky-400" },
  swappa: { label: "Swappa", dot: "bg-emerald-400" },
  poshmark: { label: "Poshmark", dot: "bg-pink-400" },
  stockx: { label: "StockX", dot: "bg-lime-400" },
  web: { label: "Web", dot: "bg-violet-400" },
};

export function sourceMeta(source: string) {
  return SOURCE_META[source] ?? { label: source, dot: "bg-muted" };
}
