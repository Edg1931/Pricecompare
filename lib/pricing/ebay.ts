import type { RawComp } from "@/lib/types";

const OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const BROWSE_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";

let cachedToken: { token: string; expiresAt: number } | null = null;

export function hasEbay() {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

async function getAppToken(): Promise<string | null> {
  if (!hasEbay()) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const basic = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString("base64");

  try {
    const res = await fetch(OAUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "https://api.ebay.com/oauth/api_scope",
      }),
    });
    if (!res.ok) {
      console.error("eBay OAuth failed:", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { access_token: string; expires_in: number };
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return cachedToken.token;
  } catch (err) {
    console.error("eBay OAuth error:", err);
    return null;
  }
}

export async function searchEbay(query: string, limit = 20): Promise<RawComp[]> {
  const token = await getAppToken();
  if (!token || !query.trim()) return [];

  const url = new URL(BROWSE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(Math.min(limit, 50)));
  url.searchParams.set("filter", "buyingOptions:{FIXED_PRICE}");

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      console.error("eBay Browse failed:", res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as {
      itemSummaries?: Array<{
        title?: string;
        price?: { value?: string; currency?: string };
        itemWebUrl?: string;
        condition?: string;
      }>;
    };
    if (!data.itemSummaries) return [];
    return data.itemSummaries
      .map((it): RawComp | null => {
        const price = Number(it.price?.value);
        if (!Number.isFinite(price) || price <= 0) return null;
        return {
          source: "ebay",
          title: it.title ?? query,
          price,
          currency: it.price?.currency ?? "USD",
          url: it.itemWebUrl ?? null,
          condition: it.condition ?? null,
          listingType: "active",
        };
      })
      .filter((c): c is RawComp => c !== null);
  } catch (err) {
    console.error("eBay Browse error:", err);
    return [];
  }
}
