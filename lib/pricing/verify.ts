import type { RawComp } from "@/lib/types";
import { hasEbay, lookupEbayItemByUrl } from "@/lib/pricing/ebay";

/**
 * URL patterns that are search/category/browse pages rather than individual
 * listings. A comp link must land on the actual item, so these lose their URL
 * (the price is still used for the estimate — it just isn't clickable).
 */
const SEARCH_PAGE_PATTERNS: RegExp[] = [
  /ebay\.[a-z.]+\/sch\//i,
  /ebay\.[a-z.]+\/b\//i,
  /ebay\.[a-z.]+\/e\//i,
  /poshmark\.com\/(search|category|brand)\b/i,
  /mercari\.com\/(search|category)/i,
  /etsy\.com\/(search|c|market)\//i,
  /facebook\.com\/marketplace\/(search|category|\d+\/?$)/i,
  /stockx\.com\/(search|browse)/i,
  /swappa\.com\/(search|buy\/?$)/i,
  /google\.[a-z.]+\/(search|shopping)/i,
  /[?&](_nkw|q|k|keyword|query)=/i,
];

export function isSearchPageUrl(url: string): boolean {
  return SEARCH_PAGE_PATTERNS.some((re) => re.test(url));
}

export function isEbayItemUrl(url: string): boolean {
  return /ebay\.[a-z.]+\/itm\//i.test(url);
}

/** Outcome of probing a non-eBay URL: keep the link, drop it, or unknown. */
async function probeUrl(url: string): Promise<"ok" | "dead" | "unknown"> {
  const headers = {
    // Marketplaces often block obvious bots; a browser UA gets an honest
    // 200/404 far more often than the default fetch UA.
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    Accept: "text/html,*/*",
  };
  try {
    let res = await fetch(url, {
      method: "HEAD",
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(4_000),
    });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        headers: { ...headers, Range: "bytes=0-2047" },
        redirect: "follow",
        signal: AbortSignal.timeout(4_000),
      });
    }
    if (res.status === 404 || res.status === 410) return "dead";
    if (res.ok || res.status === 206) return "ok";
    // 403/429/999 etc. — blocked, not proof the listing is gone.
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Verify AI-researched comp URLs so every link the app shows actually lands on
 * the listing it claims to. eBay item links are checked against the Browse
 * API (authoritative — and for ACTIVE comps the price is corrected to the
 * live price and the listing image attached). Other links get a liveness
 * probe; dead ones (404/410) lose their URL. Search-result pages always lose
 * their URL. All checks run concurrently; failures leave the comp untouched,
 * so this never makes results worse and adds at most ~5s.
 */
export async function verifyCompLinks(comps: RawComp[]): Promise<RawComp[]> {
  return Promise.all(
    comps.map(async (comp): Promise<RawComp> => {
      const url = comp.url;
      if (!url || !/^https?:\/\//i.test(url ?? "")) {
        return { ...comp, url: null };
      }
      if (isSearchPageUrl(url)) {
        return { ...comp, url: null };
      }

      if (isEbayItemUrl(url) && hasEbay()) {
        const live = await lookupEbayItemByUrl(url);
        if (live === "not_found") return { ...comp, url: null };
        if (live === "error" || live === null) return comp;
        if (comp.listingType === "sold") {
          // Keep the researched sold price; the page exists, so the link is
          // fine — but never overwrite a sold price with the relist price.
          return { ...comp, url: live.url ?? url, imageUrl: comp.imageUrl ?? live.imageUrl };
        }
        return {
          ...comp,
          url: live.url ?? url,
          price: live.price ?? comp.price,
          currency: live.currency ?? comp.currency,
          imageUrl: comp.imageUrl ?? live.imageUrl,
          title: live.title ?? comp.title,
        };
      }

      const status = await probeUrl(url);
      if (status === "dead") return { ...comp, url: null };
      return comp;
    })
  );
}
