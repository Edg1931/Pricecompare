import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { analyzeFromImages, priceAndAnalyze } from "@/lib/analysis/pipeline";
import { persistAnalysis } from "@/lib/item";
import { hasAnthropic } from "@/lib/ai/client";
import { currentUserId, ownerScope, ownerWhere } from "@/lib/auth";
import { authEnabled } from "@/lib/supabase/config";
import type { ItemIdentification } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// When provided, an already-identified item (e.g. from lot mode) skips vision
// and goes straight to pricing.
const identificationSchema = z.object({
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  condition: z.string().nullable().optional(),
  conditionNotes: z.string().nullable().optional(),
  attributes: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  searchQuery: z.string().min(1),
  confidence: z.number().optional(),
  reasoning: z.string().nullable().optional(),
});

const createSchema = z.object({
  images: z.array(z.string()).min(1, "At least one photo is required").max(8),
  askingPrice: z.number().positive().nullable().optional(),
  notes: z.string().max(2000).optional(),
  hint: z.string().max(500).optional(),
  identification: identificationSchema.optional(),
  force: z.boolean().optional(),
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

  const { images, askingPrice, notes, hint, identification, force } = parsed.data;

  const userId = await currentUserId();
  if (authEnabled() && !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate-limit item creation to bound AI spend: 20/hour globally in open
  // (unauthenticated) mode, 60/hour per signed-in user (a throwaway account
  // must not be able to drain the Anthropic budget).
  {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const limit = userId ? 60 : 20;
    const recentCount = await prisma.item.count({
      where: { userId: userId ?? null, createdAt: { gte: oneHourAgo } },
    });
    if (recentCount >= limit) {
      return NextResponse.json(
        { error: "Too many scans in the last hour. Please try again later." },
        { status: 429 }
      );
    }
  }

  // UPC barcode fast-path: if hint is a pure numeric string 8-14 chars long
  // and no identification was provided, try to look up the product via UPC API
  // before running Claude vision.
  let barcodeIdent: ItemIdentification | undefined;
  if (!identification) {
    const upcHint = hint?.trim();
    if (upcHint && /^\d{8,14}$/.test(upcHint)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const upcRes = await fetch(
          `https://api.upcitemdb.com/prod/trial/lookup?upc=${upcHint}`,
          { signal: controller.signal }
        ).finally(() => clearTimeout(timeout));
        if (upcRes.ok) {
          const upcData = await upcRes.json() as { items?: { title?: string; brand?: string; category?: string; description?: string }[] };
          const item0 = upcData.items?.[0];
          if (item0?.title) {
            barcodeIdent = {
              name: item0.title,
              brand: item0.brand ?? null,
              model: null,
              category: item0.category ?? null,
              condition: "Used",
              conditionNotes: null,
              attributes: [],
              searchQuery: [item0.brand, item0.title].filter(Boolean).join(" "),
              confidence: 0.85,
              reasoning: `Identified via UPC ${upcHint}`,
            };
          }
        }
      } catch {
        // silently fall through to Claude vision
      }
    }
  }

  // Duplicate detection: if we have an identification (passed in or from barcode)
  // and a userId, check for potential duplicates before proceeding.
  const activeIdent = identification ?? barcodeIdent;
  if (activeIdent && userId) {
    const firstWord = activeIdent.name.trim().split(/\s+/)[0];
    const existingItem = await prisma.item.findFirst({
      where: {
        ...ownerWhere(userId),
        name: { contains: firstWord, mode: "insensitive" },
        soldPrice: null,
      },
      select: { id: true, name: true },
    });
    if (existingItem && !force) {
      return NextResponse.json(
        { duplicate: true, existingId: existingItem.id, existingName: existingItem.name },
        { status: 409 }
      );
    }
  }


  try {
    const result = activeIdent
      ? await priceAndAnalyze(
          {
            ...activeIdent,
            brand: activeIdent.brand ?? null,
            model: activeIdent.model ?? null,
            category: activeIdent.category ?? null,
            condition: activeIdent.condition ?? null,
            conditionNotes: activeIdent.conditionNotes ?? null,
            attributes: activeIdent.attributes ?? [],
            confidence: activeIdent.confidence ?? 0.6,
            reasoning: activeIdent.reasoning ?? null,
          } satisfies ItemIdentification,
          askingPrice ?? null
        )
      : await analyzeFromImages(images, askingPrice ?? null, hint);
    const id = await persistAnalysis(result, {
      imageDataUrls: images,
      askingPrice: askingPrice ?? null,
      notes,
      userId,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Analyze failed:", err);
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const scope = await ownerScope();
  if (!scope.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await prisma.item.findMany({
    where: ownerWhere(scope.userId),
    orderBy: { createdAt: "desc" },
    include: { photos: { orderBy: { order: "asc" }, take: 1 } },
  });
  return NextResponse.json({ items });
}
