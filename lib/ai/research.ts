import type {
  CompSource,
  Demand,
  ItemIdentification,
  PriceTrend,
  RawComp,
} from "@/lib/types";
import { getAnthropic, MODEL } from "./client";

export interface ResearchResult {
  comps: RawComp[];
  marketContext: string | null;
  trend: PriceTrend | null;
  demand: Demand | null;
}

function parseDemand(obj: unknown): Demand | null {
  if (!obj || typeof obj !== "object") return null;
  const d = obj as Record<string, unknown>;
  const score = Number(d.sellThroughScore);
  const demand: Demand = {
    sellThroughScore:
      Number.isFinite(score) && score >= 0 ? Math.min(100, Math.round(score)) : null,
    daysToSell: typeof d.daysToSell === "string" ? d.daysToSell : null,
    seasonality: typeof d.seasonality === "string" ? d.seasonality : null,
    note: typeof d.note === "string" ? d.note : null,
  };
  if (
    demand.sellThroughScore == null &&
    !demand.daysToSell &&
    !demand.seasonality &&
    !demand.note
  ) {
    return null;
  }
  return demand;
}

function parseTrend(obj: unknown): PriceTrend | null {
  if (!obj || typeof obj !== "object") return null;
  const t = obj as Record<string, unknown>;
  const num = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const dir = t.direction;
  const direction =
    dir === "rising" || dir === "stable" || dir === "falling" ? dir : null;
  const trend: PriceTrend = {
    current: num(t.current),
    m3: num(t.m3),
    m6: num(t.m6),
    y1: num(t.y1),
    direction,
    note: typeof t.note === "string" ? t.note : null,
  };
  // Only keep it if at least one window has a value.
  if (trend.current || trend.m3 || trend.m6 || trend.y1) return trend;
  return null;
}

const VALID_SOURCES: CompSource[] = [
  "ebay",
  "etsy",
  "mercari",
  "facebook",
  "swappa",
  "poshmark",
  "stockx",
  "web",
];

function extractJsonBlock(text: string): unknown | null {
  // Prefer a fenced ```json block.
  const fenced = /```json\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced ? fenced[1] : null;
  const tryParse = (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  if (candidate) {
    const parsed = tryParse(candidate.trim());
    if (parsed) return parsed;
  }
  // Fall back to the last {...} object in the text.
  const start = text.lastIndexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return tryParse(text.slice(start, end + 1));
  }
  return null;
}

export async function researchPrices(
  ident: ItemIdentification
): Promise<ResearchResult> {
  const anthropic = getAnthropic();

  const descriptor = [
    ident.brand,
    ident.name,
    ident.model,
    ident.condition ? `(${ident.condition} condition)` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const prompt = `You are a resale pricing researcher. Find what this item ACTUALLY sells for on resale marketplaces.

Item: ${descriptor}
Category: ${ident.category ?? "unknown"}
Search query: ${ident.searchQuery}

Use web search to find comparable listings and recent sold prices across eBay, Etsy, Mercari, Facebook Marketplace, Swappa, Poshmark, and StockX. If you cannot find this exact item on resale sites, research the web to figure out what it is and find the closest comparable items, then price those.

Also estimate how this item's resale value has trended over time. Based on sold listings and demand, estimate the typical median SOLD price now, ~3 months ago, ~6 months ago, and ~1 year ago. These are best-effort estimates.

Also assess demand: how quickly and reliably this item sells (sell-through), a realistic time-to-sell range, and whether there's a best time of year to sell it for top dollar.

After researching, respond with ONLY a JSON object in a \`\`\`json code block, in this exact shape:
{
  "marketContext": "1-2 sentence summary of demand, typical price range, and how confident you are.",
  "trend": {
    "current": 123.45,
    "m3": 120.00,
    "m6": 130.00,
    "y1": 150.00,
    "direction": "rising|stable|falling",
    "note": "1 sentence on whether demand/price is rising or falling and why."
  },
  "demand": {
    "sellThroughScore": 0-100 (higher = sells faster/more reliably),
    "daysToSell": "realistic time-to-sell range, e.g. '1-2 weeks'",
    "seasonality": "best time of year to sell, or 'year-round'",
    "note": "1 sentence on demand and how easy it is to sell."
  },
  "comps": [
    { "source": "ebay|etsy|mercari|facebook|swappa|poshmark|stockx|web", "title": "listing title", "price": 123.45, "url": "https://...", "condition": "New|Used|...", "listingType": "active|sold" }
  ]
}

For the trend and demand, use null for anything you genuinely cannot estimate. Include 5-15 of the most relevant comps with real prices in USD. Only include comps you actually found.

CRITICAL accuracy rules for comps:
- The "price" MUST be the exact price shown on the page at "url" — never an approximation, rounded guess, or a price from a different listing.
- "url" must link to that specific individual listing, NOT a search results page, category page, or store homepage.
- If you cannot tie an exact price to a specific listing URL, set "url" to null rather than guessing — a comp with no link is better than a link whose price doesn't match.
- For "sold" comps: only include a "url" if that exact sold price is actually viewable at that URL. eBay/marketplace sold items are often relisted at different prices, so if the link would show a different (active) price, set "url" to null.
- Prefer fewer, verifiable comps over many uncertain ones.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 2,
      } as never,
    ],
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("\n");

  const parsed = extractJsonBlock(text) as
    | { marketContext?: string; comps?: unknown[]; trend?: unknown; demand?: unknown }
    | null;

  if (!parsed || !Array.isArray(parsed.comps)) {
    return {
      comps: [],
      marketContext: null,
      trend: parseTrend(parsed?.trend),
      demand: parseDemand(parsed?.demand),
    };
  }

  const comps: RawComp[] = [];
  for (const c of parsed.comps) {
    if (!c || typeof c !== "object") continue;
    const obj = c as Record<string, unknown>;
    const price = Number(obj.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const source = VALID_SOURCES.includes(obj.source as CompSource)
      ? (obj.source as CompSource)
      : "web";
    comps.push({
      source,
      title: String(obj.title ?? descriptor).slice(0, 200),
      price,
      currency: "USD",
      url: typeof obj.url === "string" ? obj.url : null,
      condition: typeof obj.condition === "string" ? obj.condition : null,
      listingType: obj.listingType === "sold" ? "sold" : "active",
    });
  }

  return {
    comps,
    marketContext:
      typeof parsed.marketContext === "string" ? parsed.marketContext : null,
    trend: parseTrend(parsed.trend),
    demand: parseDemand(parsed.demand),
  };
}
