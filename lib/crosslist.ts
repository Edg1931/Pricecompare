// Builds copy-ready, platform-tailored listing drafts from an analyzed item.
// We can't post via API without per-platform OAuth, so each draft gives
// copyable fields plus a deep link to that platform's "create listing" page.

export interface CrossListing {
  platform: string;
  createUrl: string;
  titleLimit: number;
  title: string;
  price: number | null;
  description: string;
  tags?: string[];
}

const PLATFORMS: {
  platform: string;
  createUrl: string;
  titleLimit: number;
  tags?: boolean;
}[] = [
  { platform: "eBay", createUrl: "https://www.ebay.com/sl/sell", titleLimit: 80 },
  {
    platform: "Facebook Marketplace",
    createUrl: "https://www.facebook.com/marketplace/create/item",
    titleLimit: 100,
  },
  {
    platform: "Etsy",
    createUrl: "https://www.etsy.com/your/shops/me/tools/listings/create",
    titleLimit: 140,
    tags: true,
  },
];

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

function buildTags(input: CrossListInput): string[] {
  const raw = [
    input.brand,
    input.model,
    input.category,
    input.name,
    ...(input.attributes?.map((a) => a.value) ?? []),
  ]
    .filter(Boolean)
    .join(" ");
  const words = raw
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && w.length <= 20);
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const w of words) {
    if (seen.has(w)) continue;
    seen.add(w);
    tags.push(w);
    if (tags.length >= 13) break;
  }
  return tags;
}

export interface CrossListInput {
  name: string;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  condition?: string | null;
  listingTitle?: string | null;
  listingDescription?: string | null;
  recommendedMedian?: number | null;
  attributes?: { label: string; value: string }[];
}

export function buildCrossListings(input: CrossListInput): CrossListing[] {
  const baseTitle = (
    input.listingTitle ||
    [input.brand, input.name, input.model].filter(Boolean).join(" ") ||
    input.name
  ).trim();
  const baseDesc = (input.listingDescription || "").trim();
  const tags = buildTags(input);

  return PLATFORMS.map((p) => ({
    platform: p.platform,
    createUrl: p.createUrl,
    titleLimit: p.titleLimit,
    title: truncate(baseTitle, p.titleLimit),
    price: input.recommendedMedian ?? null,
    description: baseDesc,
    tags: p.tags ? tags : undefined,
  }));
}
