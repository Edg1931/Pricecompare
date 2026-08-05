import { describe, expect, it } from "vitest";
import { isEbayItemUrl, isSearchPageUrl } from "./verify";

describe("isSearchPageUrl", () => {
  it("flags marketplace search and category pages", () => {
    expect(isSearchPageUrl("https://www.ebay.com/sch/i.html?_nkw=nintendo")).toBe(true);
    expect(isSearchPageUrl("https://www.ebay.com/b/Video-Games/139973/bn_320042")).toBe(true);
    expect(isSearchPageUrl("https://poshmark.com/search?query=jordan+1")).toBe(true);
    expect(isSearchPageUrl("https://poshmark.com/brand/Nike")).toBe(true);
    expect(isSearchPageUrl("https://www.mercari.com/search/?keyword=switch")).toBe(true);
    expect(isSearchPageUrl("https://www.etsy.com/search?q=vintage+lamp")).toBe(true);
    expect(isSearchPageUrl("https://www.etsy.com/c/vintage/lighting")).toBe(true);
    expect(isSearchPageUrl("https://www.facebook.com/marketplace/search?query=couch")).toBe(true);
    expect(isSearchPageUrl("https://stockx.com/search?s=dunk+low")).toBe(true);
    expect(isSearchPageUrl("https://swappa.com/search?q=iphone")).toBe(true);
    expect(isSearchPageUrl("https://www.google.com/search?q=ps5+price")).toBe(true);
  });

  it("passes individual listing pages", () => {
    expect(isSearchPageUrl("https://www.ebay.com/itm/195923456789")).toBe(false);
    expect(isSearchPageUrl("https://www.ebay.com/itm/Nintendo-Switch/195923456789")).toBe(false);
    expect(isSearchPageUrl("https://poshmark.com/listing/Nike-Air-Max-abc123")).toBe(false);
    expect(isSearchPageUrl("https://www.mercari.com/us/item/m12345678901/")).toBe(false);
    expect(isSearchPageUrl("https://www.etsy.com/listing/123456789/vintage-brass-lamp")).toBe(false);
    expect(isSearchPageUrl("https://www.facebook.com/marketplace/item/1234567890/")).toBe(false);
    expect(isSearchPageUrl("https://stockx.com/nike-dunk-low-panda")).toBe(false);
    expect(isSearchPageUrl("https://swappa.com/listing/view/ABC123")).toBe(false);
  });
});

describe("isEbayItemUrl", () => {
  it("matches item URLs across TLDs and legacy formats", () => {
    expect(isEbayItemUrl("https://www.ebay.com/itm/195923456789")).toBe(true);
    expect(isEbayItemUrl("https://www.ebay.co.uk/itm/195923456789")).toBe(true);
    expect(isEbayItemUrl("https://www.ebay.com/itm/Some-Title/195923456789")).toBe(true);
  });
  it("rejects non-item eBay URLs and other domains", () => {
    expect(isEbayItemUrl("https://www.ebay.com/sch/i.html?_nkw=x")).toBe(false);
    expect(isEbayItemUrl("https://poshmark.com/listing/abc")).toBe(false);
  });
});
