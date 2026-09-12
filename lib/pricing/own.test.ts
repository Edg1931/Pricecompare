import { describe, expect, it } from "vitest";
import { nameSimilarity, significantTokens } from "./own";

describe("significantTokens", () => {
  it("drops stop words, short tokens, and punctuation", () => {
    const t = significantTokens("The Vintage Pyrex Bowl - Set of 2, used!");
    expect(t.has("pyrex")).toBe(true);
    expect(t.has("bowl")).toBe(true);
    expect(t.has("the")).toBe(false);
    expect(t.has("vintage")).toBe(false); // too generic for product identity
    expect(t.has("of")).toBe(false);
  });
});

describe("nameSimilarity", () => {
  it("scores a contained product name as a full match", () => {
    expect(
      nameSimilarity("Apple Watch Ultra", "Apple Watch Ultra 49mm GPS Titanium")
    ).toBe(1);
  });

  it("disqualifies conflicting model identifiers", () => {
    expect(nameSimilarity("Canon EOS R5", "Canon EOS R6")).toBe(0);
    expect(nameSimilarity("Sony PS5 Console", "Sony PS4 Console")).toBe(0);
    // Shared model number stays a match even when other tokens differ.
    expect(
      nameSimilarity("iPhone 13 Pro 128GB", "iPhone 13 Pro 256GB")
    ).toBeGreaterThanOrEqual(0.6);
  });

  it("scores unrelated items low", () => {
    expect(nameSimilarity("Vintage Radio", "Vintage Pyrex Bowl")).toBeLessThan(0.6);
    expect(nameSimilarity("Nintendo Switch OLED", "KitchenAid Mixer")).toBe(0);
  });

  it("is order-insensitive and case-insensitive", () => {
    expect(nameSimilarity("ultra apple WATCH", "Apple Watch Ultra")).toBe(1);
  });

  it("handles empty/stop-word-only names", () => {
    expect(nameSimilarity("", "Apple Watch")).toBe(0);
    expect(nameSimilarity("the of", "Apple Watch")).toBe(0);
  });
});
