import type { RawComp } from "@/lib/types";

const OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const BROWSE_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";
const INSIGHTS_URL =
  "https://api.ebay.com/buy/marketplace_insights/v1_beta/item_sales/search";

const BASE_SCOPE = "https://api.ebay.com/oauth/api_scope";
const INSIGHTS_SCOPE =
  "https://api.ebay.com/oauth/api_scope/buy.marketplace.insights";

// One cached token per scope (Browse uses the base scope; sold-comps needs the
// Marketplace Insights scope, which eBay grants only to approved apps).
const tokenCache: Record<string, { token: string; expiresAt: number }> = {};

// Once we learn the app isn't approved for Marketplace Insights, stop calling
// it for the life of this server instance so we don't waste round-trips.
let insightsDisabled = false;

export function hasEbay() {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

async function getToken(scope: string): Promise<string | null> {
  if (!hasEbay()) return null;
  const cached = tokenCache[scope];
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

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
      body: new URLSearchParams({ grant_type: "client_credentials", scope }),
    });
    if (!res.ok) {
      console.error("eBay OAuth failed:", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { access_token: string; expires_in: number };
    tokenCache[scope] = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  } catch (err) {
    console.error("eBay OAuth error:", err);
    return null;
  }
}

export async function searchEbay(query: string, limit = 20): Promise<RawComp[]> {
  const token = await getToken(BASE_SCOPE);
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
        image?: { imageUrl?: string };
        thumbnailImages?: Array<{ imageUrl?: string }>;
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
          imageUrl: it.image?.imageUrl ?? it.thumbnailImages?.[0]?.imageUrl ?? null,
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

/**
 * Recent SOLD/completed comps from eBay's Marketplace Insights API — the truest
 * signal of resale value. Requires the app to be approved for the Insights
 * scope; until then (or if eBay denies it) this degrades to an empty list and
 * the estimate falls back to active listings + web-researched sold prices.
 */
export async function searchEbaySold(query: string, limit = 20): Promise<RawComp[]> {
  if (insightsDisabled || !query.trim()) return [];
  const token = await getToken(INSIGHTS_SCOPE);
  if (!token) {
    // Scope not granted to this app — don't keep trying this instance.
    insightsDisabled = true;
    return [];
  }

  const url = new URL(INSIGHTS_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(Math.min(limit, 50)));

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      // 401/403 means the app isn't authorized for Insights — disable it.
      if (res.status === 401 || res.status === 403) insightsDisabled = true;
      console.error("eBay Insights failed:", res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as {
      itemSales?: Array<{
        title?: string;
        lastSoldPrice?: { value?: string; currency?: string };
        itemWebUrl?: string;
        image?: { imageUrl?: string };
        thumbnailImages?: Array<{ imageUrl?: string }>;
        condition?: string;
      }>;
    };
    if (!data.itemSales) return [];
    return data.itemSales
      .map((it): RawComp | null => {
        const price = Number(it.lastSoldPrice?.value);
        if (!Number.isFinite(price) || price <= 0) return null;
        return {
          source: "ebay",
          title: it.title ?? query,
          price,
          currency: it.lastSoldPrice?.currency ?? "USD",
          url: it.itemWebUrl ?? null,
          imageUrl: it.image?.imageUrl ?? it.thumbnailImages?.[0]?.imageUrl ?? null,
          condition: it.condition ?? null,
          listingType: "sold",
        };
      })
      .filter((c): c is RawComp => c !== null);
  } catch (err) {
    console.error("eBay Insights error:", err);
    return [];
  }
}
