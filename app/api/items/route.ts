import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { analyzeFromImages } from "@/lib/analysis/pipeline";
import { persistAnalysis } from "@/lib/item";
import { hasAnthropic } from "@/lib/ai/client";

export const runtime = "nodejs";
export const maxDuration = 120;

const createSchema = z.object({
  images: z.array(z.string()).min(1, "At least one photo is required").max(8),
  askingPrice: z.number().positive().nullable().optional(),
  notes: z.string().max(2000).optional(),
  hint: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  if (!hasAnthropic()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const { images, askingPrice, notes, hint } = parsed.data;

  try {
    const result = await analyzeFromImages(images, askingPrice ?? null, hint);
    const id = await persistAnalysis(result, {
      imageDataUrls: images,
      askingPrice: askingPrice ?? null,
      notes,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Analyze failed:", err);
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const items = await prisma.item.findMany({
    orderBy: { createdAt: "desc" },
    include: { photos: { orderBy: { order: "asc" }, take: 1 } },
  });
  return NextResponse.json({ items });
}
