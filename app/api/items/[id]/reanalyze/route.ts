import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { priceAndAnalyze } from "@/lib/analysis/pipeline";
import { parseAttributes } from "@/lib/item";
import { hasAnthropic } from "@/lib/ai/client";
import type { ItemIdentification } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasAnthropic()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ident: ItemIdentification = {
    name: item.name,
    brand: item.brand,
    model: item.model,
    category: item.category,
    condition: item.condition,
    conditionNotes: null,
    attributes: parseAttributes(item.attributes),
    searchQuery: item.searchQuery ?? item.name,
    confidence: item.identConfidence ?? 0.5,
    reasoning: item.identNotes,
  };

  try {
    const result = await priceAndAnalyze(ident, item.askingPrice);
    // Replace comps and refresh pricing fields.
    await prisma.comp.deleteMany({ where: { itemId: id } });
    await prisma.item.update({
      where: { id },
      data: {
        recommendedLow: result.aggregate.low,
        recommendedMedian: result.aggregate.median,
        recommendedHigh: result.aggregate.high,
        priceConfidence: result.aggregate.confidence,
        sampleSize: result.aggregate.sampleSize,
        marketContext: result.marketContext,
        priceTrend: result.trend ? JSON.stringify(result.trend) : item.priceTrend,
        demand: result.demand ? JSON.stringify(result.demand) : item.demand,
        dealScore: result.deal.dealScore,
        verdict: result.deal.verdict,
        bestPlatform: result.deal.bestPlatform,
        netProceeds: JSON.stringify(result.deal.netProceeds),
        analysisSummary: result.deal.summary,
        listingTitle: result.listing?.title ?? item.listingTitle,
        listingDescription: result.listing?.description ?? item.listingDescription,
        comps: {
          create: result.comps.map((c) => ({
            source: c.source,
            title: c.title,
            price: c.price,
            currency: c.currency ?? "USD",
            url: c.url ?? null,
            condition: c.condition ?? null,
            listingType: c.listingType ?? "active",
          })),
        },
        snapshots: {
          create: [
            {
              low: result.aggregate.low,
              median: result.aggregate.median,
              high: result.aggregate.high,
              sampleSize: result.aggregate.sampleSize,
            },
          ],
        },
      },
    });
    return NextResponse.json({ id });
  } catch (err) {
    console.error("Reanalyze failed:", err);
    const message = err instanceof Error ? err.message : "Reanalysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
