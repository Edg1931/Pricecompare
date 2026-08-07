import { describe, expect, it } from "vitest";
import {
  analyzeDeal,
  bestSellingOption,
  computeNetProceeds,
  marketplaceFee,
  negotiation,
  realizedPnL,
  sourcingMetrics,
} from "./deal";

describe("analyzeDeal", () => {
  it("returns no verdict without a median", () => {
    const d = analyzeDeal(null, 20);
    expect(d.verdict).toBeNull();
    expect(d.dealScore).toBeNull();
  });

  it("returns no verdict without an asking price", () => {
    const d = analyzeDeal(100, null);
    expect(d.verdict).toBeNull();
    expect(d.summary).toContain("$100");
  });

  it("refuses a verdict below 3 comps", () => {
    const d = analyzeDeal(100, 20, 2);
    expect(d.verdict).toBeNull();
    expect(d.dealScore).toBeNull();
    expect(d.summary).toContain("2 comparable listings");
  });

  it("issues verdicts at the documented ratio thresholds", () => {
    expect(analyzeDeal(100, 60, 10).verdict).toBe("STEAL"); // ratio 0.6
    expect(analyzeDeal(100, 61, 10).verdict).toBe("GOOD");
    expect(analyzeDeal(100, 85, 10).verdict).toBe("GOOD"); // ratio 0.85
    expect(analyzeDeal(100, 86, 10).verdict).toBe("FAIR");
    expect(analyzeDeal(100, 110, 10).verdict).toBe("FAIR"); // ratio 1.1
    expect(analyzeDeal(100, 111, 10).verdict).toBe("OVERPRICED");
  });

  it("scores 50 at market price, clamps to 0..100", () => {
    expect(analyzeDeal(100, 100, 10).dealScore).toBe(50);
    expect(analyzeDeal(100, 1, 10).dealScore).toBe(100); // near-free
    expect(analyzeDeal(100, 500, 10).dealScore).toBe(0); // way overpriced
  });
});

describe("marketplaceFee", () => {
  it("computes the eBay fee (13.25% + $0.30)", () => {
    expect(marketplaceFee("eBay", 100)).toBe(13.55);
  });

  it("is case-insensitive and 0 for unknown platforms", () => {
    expect(marketplaceFee("ebay", 100)).toBe(13.55);
    expect(marketplaceFee("Craigslist", 100)).toBe(0);
    expect(marketplaceFee(null, 100)).toBe(0);
  });
});

describe("computeNetProceeds", () => {
  it("sorts best net first and never goes negative", () => {
    const nets = computeNetProceeds(1);
    expect(nets[0].net).toBeGreaterThanOrEqual(nets[nets.length - 1].net);
    for (const n of nets) expect(n.net).toBeGreaterThanOrEqual(0);
  });

  it("puts zero-fee local pickup at the top", () => {
    const nets = computeNetProceeds(100);
    expect(nets[0].platform).toBe("Facebook Marketplace");
    expect(nets[0].net).toBe(100);
  });
});

describe("bestSellingOption", () => {
  const nets = computeNetProceeds(100);

  it("never recommends the zero-fee local channel", () => {
    expect(bestSellingOption(nets, null)!.platform).not.toBe("Facebook Marketplace");
    expect(bestSellingOption(nets, "Electronics")!.platform).not.toBe(
      "Facebook Marketplace"
    );
  });

  it("only recommends specialists when the category fits", () => {
    // No category: generals only (eBay/Mercari), even though Swappa nets more.
    const generic = bestSellingOption(nets, null)!;
    expect(["eBay", "Mercari"]).toContain(generic.platform);

    // Tech category unlocks Swappa (3% — highest shipped net).
    expect(bestSellingOption(nets, "Consumer Electronics — Phone")!.platform).toBe(
      "Swappa"
    );
    // Clothing unlocks Poshmark eligibility but eBay/Mercari still net more.
    const clothing = bestSellingOption(nets, "Clothing & Apparel")!;
    expect(["eBay", "Mercari"]).toContain(clothing.platform);
    // Vintage unlocks Etsy (9% + 0.20 beats eBay/Mercari).
    expect(bestSellingOption(nets, "Vintage kitchenware")!.platform).toBe("Etsy");
  });

  it("flows into analyzeDeal's bestPlatform and profit numbers", () => {
    const deal = analyzeDeal(100, 50, 10, "Video game console");
    expect(deal.bestPlatform).toBe("Swappa"); // console matches Swappa + StockX; Swappa nets more
    expect(deal.estimatedProfit).toBe(47); // 100*0.97 - 50
    const noCat = analyzeDeal(100, 50, 10);
    expect(noCat.bestPlatform).not.toBe("Facebook Marketplace");
    // eBay nets 86.45, Mercari 86.6 → Mercari at $100
    expect(noCat.bestPlatform).toBe("Mercari");
    expect(noCat.estimatedProfit).toBeCloseTo(36.6, 2);
  });
});

describe("realizedPnL", () => {
  it("returns null when unsold", () => {
    expect(
      realizedPnL({ purchasePrice: 5, soldPrice: null, soldMarketplace: null, shippingCost: null })
    ).toBeNull();
  });

  it("computes net with estimated fees and tax on positive profit", () => {
    const pnl = realizedPnL({
      purchasePrice: 20,
      soldPrice: 100,
      soldMarketplace: "eBay",
      shippingCost: 10,
      taxRate: 0.25,
    })!;
    expect(pnl.fees).toBe(13.55);
    expect(pnl.net).toBe(56.45);
    expect(pnl.tax).toBe(14.11);
    expect(pnl.afterTax).toBe(42.34);
  });

  it("takes the fee override over the estimate and skips tax on losses", () => {
    const pnl = realizedPnL({
      purchasePrice: 100,
      soldPrice: 50,
      soldMarketplace: "eBay",
      shippingCost: null,
      feesOverride: 5,
    })!;
    expect(pnl.fees).toBe(5);
    expect(pnl.net).toBe(-55);
    expect(pnl.tax).toBe(0);
  });
});

describe("sourcingMetrics", () => {
  it("returns null without median or asking price", () => {
    expect(sourcingMetrics(null, 10, [])).toBeNull();
    expect(sourcingMetrics(100, null, [])).toBeNull();
    expect(sourcingMetrics(100, 0, [])).toBeNull();
  });

  it("recommends BUY/CONSIDER/PASS at the ratio thresholds", () => {
    const nets = computeNetProceeds(100);
    expect(sourcingMetrics(100, 85, nets)!.recommendation).toBe("BUY");
    expect(sourcingMetrics(100, 100, nets)!.recommendation).toBe("CONSIDER");
    expect(sourcingMetrics(100, 120, nets)!.recommendation).toBe("PASS");
  });
});

describe("negotiation", () => {
  it("keeps the opening offer at or below the max buy", () => {
    for (const median of [10, 37, 80, 123, 999]) {
      const n = negotiation(median, null)!;
      expect(n.opening).toBeLessThanOrEqual(n.maxBuy);
      expect(n.maxBuy).toBeGreaterThanOrEqual(1);
    }
  });

  it("caps the opening at 80% of asking when asking is low", () => {
    const n = negotiation(100, 20)!;
    expect(n.opening).toBeLessThanOrEqual(Math.round((20 * 0.8) / 5) * 5);
  });
});
