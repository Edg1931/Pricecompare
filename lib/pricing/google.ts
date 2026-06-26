import type { RawComp } from "@/lib/types";

const CSE_URL = "https://www.googleapis.com/customsearch/v1";

export function hasGoogle(): boolean {
  return Boolean(process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_ID);
}

interface CseItem {
  title?: string;
  link?: string;
  snippet?: string;
  pagemap?: {
    offer?: Array<{
      price?: string;
      name?: string;
      image?: string;
      condition?: string;
      availability?: string;
    }>;
    product?: Array<{ name?: string; image?: string }>;
    cse_image?: Array<{ src?: string }>;
    metatags?: Array<Record<string, string>>;
  };
}

function parsePrice(raw: string | undefined): number | null {
  if (!raw) return null;
  // Strip currency symbols, commas, whitespace; parse the first number found
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Pull shopping comps from Google Custom Search (requires GOOGLE_CSE_KEY +
 * GOOGLE_CSE_ID env vars). Returns an empty list when not configured.
 *
 * Set up a Programmable Search Engine at programmablesearchengine.google.com
 * that searches the entire web with "Search the web" enabled — results will
 * include Google Shopping product cards via pagemap.offer rich snippets.
 */
export async function searchGoogleShopping(
  query: string,
  limit = 10
): Promise<RawComp[]> {
  if (!hasGoogle() || !query.trim()) return [];

  const url = new URL(CSE_URL);
  url.searchParams.set("key", process.env.GOOGLE_CSE_KEY!);
  url.searchParams.set("cx", process.env.GOOGLE_CSE_ID!);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(Math.min(limit, 10)));

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.error("Google CSE failed:", res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as { items?: CseItem[] };
    if (!data.items) return [];

    const comps: RawComp[] = [];

    for (const item of data.items) {
      const offers = item.pagemap?.offer ?? [];

      if (offers.length > 0) {
        for (const offer of offers) {
          const price = parsePrice(offer.price);
          if (!price) continue;
          const imageUrl =
            offer.image ??
            item.pagemap?.product?.[0]?.image ??
            item.pagemap?.cse_image?.[0]?.src ??
            null;
          comps.push({
            source: "google",
            title: offer.name ?? item.title ?? query,
            price,
            currency: "USD",
            url: item.link ?? null,
            imageUrl,
            condition: offer.condition ?? null,
            listingType: "active",
          });
        }
      } else {
        // No structured offer data — try og:price meta tags as a fallback
        const meta = item.pagemap?.metatags?.[0];
        const price = parsePrice(
          meta?.["og:price:amount"] ??
            meta?.["product:price:amount"] ??
            meta?.["twitter:data1"]
        );
        if (!price) continue;
        const imageUrl =
          meta?.["og:image"] ??
          item.pagemap?.cse_image?.[0]?.src ??
          null;
        comps.push({
          source: "google",
          title: item.title ?? query,
          price,
          currency: "USD",
          url: item.link ?? null,
          imageUrl,
          condition: null,
          listingType: "active",
        });
      }

      if (comps.length >= limit) break;
    }

    return comps;
  } catch (err) {
    console.error("Google CSE error:", err);
    return [];
  }
}
