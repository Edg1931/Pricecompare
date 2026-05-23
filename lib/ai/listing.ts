import type { ItemIdentification, ListingKit } from "@/lib/types";
import { getAnthropic, MODEL } from "./client";
import { formatCurrency } from "@/lib/utils";

const LISTING_TOOL = {
  name: "write_listing",
  description: "Write a ready-to-post resale listing title and description.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: {
        type: "string",
        description:
          "An optimized, keyword-rich listing title (max ~80 chars) a buyer would search for.",
      },
      description: {
        type: "string",
        description:
          "A compelling marketplace description: condition, key features, and selling points. 3-6 sentences.",
      },
    },
    required: ["title", "description"],
  },
};

export async function generateListing(
  ident: ItemIdentification,
  recommendedMedian: number | null
): Promise<ListingKit | null> {
  try {
    const anthropic = getAnthropic();
    const priceLine = recommendedMedian
      ? `Suggested price: ${formatCurrency(recommendedMedian)}.`
      : "";
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 700,
      tools: [LISTING_TOOL],
      tool_choice: { type: "tool", name: "write_listing" },
      messages: [
        {
          role: "user",
          content: `Write a resale listing for this item.\n\nName: ${ident.name}\nBrand: ${ident.brand ?? "—"}\nModel: ${ident.model ?? "—"}\nCondition: ${ident.condition ?? "—"}${ident.conditionNotes ? ` (${ident.conditionNotes})` : ""}\nAttributes: ${ident.attributes.map((a) => `${a.label}: ${a.value}`).join(", ") || "—"}\n${priceLine}\n\nThen call write_listing.`,
        },
      ],
    });
    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return null;
    const input = toolUse.input as Record<string, unknown>;
    return {
      title: String(input.title ?? ident.name),
      description: String(input.description ?? ""),
    };
  } catch (err) {
    console.error("Listing generation failed:", err);
    return null;
  }
}
