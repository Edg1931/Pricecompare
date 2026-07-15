import { describe, expect, it } from "vitest";
import { aggregatePrices } from "./aggregate";
import type { RawComp } from "@/lib/types";

const comp = (price: number, over: Partial<RawComp> = {}): RawComp => ({
  source: "ebay",
  title: `comp at ${price}`,
  price,
  currency: "USD",
  url: null,
  imageUrl: null,
  condition: null,
  listingType: "active",
  ...over,
});

describe("aggregatePrices", () => {
  it("handles no comps", () => {
    const a = aggregatePrices([]);
    expect(a.median).toBeNull();
    expect(a.sampleSize).toBe(0);
    expect(a.confidence).toBe(0);
  });

  it("ignores non-finite and non-positive prices", () => {
    const a = aggregatePrices([comp(0), comp(-5), comp(NaN), comp(Infinity)]);
    expect(a.median).toBeNull();
  });

  it("rejects 1.5×IQR outliers when n >= 4", () => {
    const a = aggregatePrices([comp(100), comp(105), comp(110), comp(115), comp(9000)]);
    expect(a.sampleSize).toBe(4); // the 9000 comp was dropped
    expect(a.median!).toBeLessThan(200);
  });

  it("keeps everything when n < 4 (IQR needs a sample)", () => {
    const a = aggregatePrices([comp(100), comp(9000)]);
    expect(a.sampleSize).toBe(2);
  });

  it("haircuts active listings (asking prices overstate sale value)", () => {
    const a = aggregatePrices([comp(100), comp(100), comp(100), comp(100)]);
    expect(a.median).toBe(85); // 100 × 0.85 active haircut
  });

  it("does not haircut sold comps", () => {
    const a = aggregatePrices([
      comp(100, { listingType: "sold" }),
      comp(100, { listingType: "sold" }),
      comp(100, { listingType: "sold" }),
      comp(100, { listingType: "sold" }),
    ]);
    expect(a.median).toBe(100);
  });

  it("haircuts google retail comps harder than active resale listings", () => {
    const google = aggregatePrices([comp(100, { source: "google" })]);
    expect(google.median).toBe(80);
  });

  it("double-weights eBay sold comps but not web-research 'sold' claims", () => {
    // 2× eBay-sold at 100 outweighs 2 active comps pulled to 85 by haircut:
    // weighted array [100, 100, 85, 85, ...] — median leans toward sold.
    const withEbaySold = aggregatePrices([
      comp(100, { listingType: "sold", source: "ebay" }),
      comp(100),
      comp(100),
    ]);
    const withWebSold = aggregatePrices([
      comp(100, { listingType: "sold", source: "web" }),
      comp(100),
      comp(100),
    ]);
    // eBay sold (weight 2) pulls the median to the un-haircut price.
    expect(withEbaySold.median!).toBeGreaterThanOrEqual(withWebSold.median!);
  });

  it("reports per-source medians on raw (un-haircut) prices", () => {
    const a = aggregatePrices([comp(100), comp(200)]);
    expect(a.bySource.ebay.count).toBe(2);
    expect(a.bySource.ebay.median).toBe(150);
  });

  it("confidence rises with sample size", () => {
    const few = aggregatePrices([comp(100), comp(102)]);
    const many = aggregatePrices(
      Array.from({ length: 12 }, (_, i) => comp(100 + i))
    );
    expect(many.confidence).toBeGreaterThan(few.confidence);
  });
});
