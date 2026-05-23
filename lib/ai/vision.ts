import type { ItemIdentification } from "@/lib/types";
import { getAnthropic, MODEL, parseDataUrl } from "./client";

const IDENT_TOOL = {
  name: "report_item",
  description:
    "Report the identified item with all known details for resale price research.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "Concise product name a reseller would search for.",
      },
      brand: { type: "string", description: "Brand/maker if identifiable." },
      model: {
        type: "string",
        description: "Specific model name/number, size, or edition if identifiable.",
      },
      category: {
        type: "string",
        description: "Category, e.g. Sneakers, Phone, Handbag, Collectible, Furniture.",
      },
      condition: {
        type: "string",
        enum: ["New", "Like New", "Good", "Fair", "Poor", "Unknown"],
        description: "Estimated condition based on visible wear.",
      },
      conditionNotes: {
        type: "string",
        description: "Visible flaws, wear, or notable condition details.",
      },
      attributes: {
        type: "array",
        description: "Key identifying attributes (color, material, size, year, etc.).",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            value: { type: "string" },
          },
          required: ["label", "value"],
        },
      },
      searchQuery: {
        type: "string",
        description:
          "An optimized marketplace search query to find comparable resale listings.",
      },
      confidence: {
        type: "number",
        description: "Confidence in this identification from 0 to 1.",
      },
      reasoning: {
        type: "string",
        description: "Brief explanation of how the item was identified.",
      },
    },
    required: ["name", "attributes", "searchQuery", "confidence"],
  },
};

export async function identifyItem(
  imageDataUrls: string[],
  userHint?: string
): Promise<ItemIdentification> {
  const anthropic = getAnthropic();

  const imageBlocks = imageDataUrls.slice(0, 8).map((url) => {
    const { mediaType, data } = parseDataUrl(url);
    return {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: mediaType,
        data,
      },
    };
  });

  const promptText = `You are an expert reseller and appraiser. Identify the item in these ${imageBlocks.length} photo(s) as precisely as possible for resale price research. Use every visible clue: logos, tags, labels, model numbers, materials, and proportions.${
    userHint ? `\n\nThe user added this hint: "${userHint}"` : ""
  }\n\nBe specific — include brand, model, and distinguishing attributes when you can see them. If uncertain, give your best guess and lower the confidence. Then call the report_item tool.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [IDENT_TOOL],
    tool_choice: { type: "tool", name: "report_item" },
    messages: [
      {
        role: "user",
        content: [...imageBlocks, { type: "text", text: promptText }],
      },
    ],
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Vision model did not return a structured identification.");
  }
  const input = toolUse.input as Record<string, unknown>;

  return {
    name: String(input.name ?? "Unknown item"),
    brand: (input.brand as string) ?? null,
    model: (input.model as string) ?? null,
    category: (input.category as string) ?? null,
    condition: (input.condition as string) ?? null,
    conditionNotes: (input.conditionNotes as string) ?? null,
    attributes: Array.isArray(input.attributes)
      ? (input.attributes as { label: string; value: string }[])
      : [],
    searchQuery: String(input.searchQuery ?? input.name ?? ""),
    confidence:
      typeof input.confidence === "number"
        ? Math.max(0, Math.min(1, input.confidence))
        : 0.5,
    reasoning: (input.reasoning as string) ?? null,
  };
}
