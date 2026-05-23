import type { CompSource, ItemIdentification, RawComp } from "@/lib/types";
import { getAnthropic, MODEL } from "./client";

export interface ResearchResult {
  comps: RawComp[];
  marketContext: string | null;
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

After researching, respond with ONLY a JSON object in a \`\`\`json code block, in this exact shape:
{
  "marketContext": "1-2 sentence summary of demand, typical price range, and how confident you are.",
  "comps": [
    { "source": "ebay|etsy|mercari|facebook|swappa|poshmark|stockx|web", "title": "listing title", "price": 123.45, "url": "https://...", "condition": "New|Used|...", "listingType": "active|sold" }
  ]
}

Include 5-15 of the most relevant comps with real prices in USD. Only include comps you actually found.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 4,
      } as never,
    ],
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("\n");

  const parsed = extractJsonBlock(text) as
    | { marketContext?: string; comps?: unknown[] }
    | null;

  if (!parsed || !Array.isArray(parsed.comps)) {
    return { comps: [], marketContext: null };
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
  };
}
