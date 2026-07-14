import { describe, expect, it } from "vitest";
import { parseAttributes, parseNetProceeds } from "./item";

describe("parseNetProceeds", () => {
  it("returns [] for null, malformed JSON, and non-arrays", () => {
    expect(parseNetProceeds(null)).toEqual([]);
    expect(parseNetProceeds("not json")).toEqual([]);
    expect(parseNetProceeds('{"platform":"eBay"}')).toEqual([]);
  });

  it("parses a valid platform-net array", () => {
    const json = JSON.stringify([{ platform: "eBay", net: 86.45, feePct: 0.1325 }]);
    expect(parseNetProceeds(json)[0].net).toBe(86.45);
  });
});

describe("parseAttributes", () => {
  it("returns [] for null and malformed input", () => {
    expect(parseAttributes(null)).toEqual([]);
    expect(parseAttributes("{{")).toEqual([]);
  });

  it("parses a valid label/value array", () => {
    const json = JSON.stringify([{ label: "Size", value: "M" }]);
    expect(parseAttributes(json)).toEqual([{ label: "Size", value: "M" }]);
  });
});
