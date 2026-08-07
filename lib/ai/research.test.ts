import { describe, expect, it } from "vitest";
import { extractJsonBlock } from "./research";

const FULL = `Here's what I found.
\`\`\`json
{"marketContext":"ok","comps":[{"source":"ebay","price":100},{"source":"mercari","price":90}]}
\`\`\``;

describe("extractJsonBlock", () => {
  it("parses a fenced json block", () => {
    const parsed = extractJsonBlock(FULL) as { comps: unknown[] };
    expect(parsed.comps).toHaveLength(2);
  });

  it("parses bare outermost braces with trailing prose", () => {
    const text = `Result: {"comps":[{"source":"ebay","price":100}]} hope that helps {"note":"x"}`;
    // Outermost span isn't valid JSON here, so salvage walks back to the
    // last parseable close — the comps object must survive.
    const parsed = extractJsonBlock(text) as { comps?: unknown[] };
    expect(Array.isArray(parsed?.comps)).toBe(true);
  });

  it("salvages output truncated mid-comp (max_tokens cutoff)", () => {
    const truncated = `\`\`\`json
{"marketContext":"good demand","comps":[
  {"source":"ebay","title":"A","price":100,"listingType":"sold"},
  {"source":"mercari","title":"B","price":90,"listingType":"active"},
  {"source":"poshmark","title":"C","pri`;
    const parsed = extractJsonBlock(truncated) as {
      marketContext?: string;
      comps?: unknown[];
    };
    expect(parsed).not.toBeNull();
    expect(parsed.marketContext).toBe("good demand");
    expect(parsed.comps).toHaveLength(2);
  });

  it("returns null for hopeless input", () => {
    expect(extractJsonBlock("no json here at all")).toBeNull();
  });
});
