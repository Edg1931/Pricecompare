import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUserId, ownerWhere } from "@/lib/auth";
import { getAnthropic } from "@/lib/ai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Use Haiku for speed and cost — vision is sufficient for similarity scoring.
const SIM_MODEL = "claude-haiku-4-5-20251001";

function extractJsonArray(text: string): unknown[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Build a content block array for claude.messages.create. We avoid the
// Anthropic.MessageParam type annotation here to sidestep SDK type complexity
// for dynamic arrays mixing text + URL-image blocks.
function buildContent(
  itemPhotos: string[],
  comps: Array<{ id: string; title: string; source: string; imageUrl: string }>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [];

  blocks.push({
    type: "text",
    text: "Here are photos of the item I'm evaluating:",
  });

  for (const url of itemPhotos) {
    blocks.push({
      type: "image",
      source: { type: "url" as const, url },
    });
  }

  blocks.push({
    type: "text",
    text:
      `Below are ${comps.length} comparable listing images. ` +
      `Rate each by visual similarity to the item above (0-100):\n` +
      `90-100: Same exact model/variant and color\n` +
      `70-89: Same model, minor variation (color/edition)\n` +
      `50-69: Same category/type, clearly similar\n` +
      `20-49: Loosely related (same brand or general category)\n` +
      `0-19: Different item or mismatch\n\n` +
      `Reply ONLY with a JSON array — no other text:\n` +
      `[{"id":"<comp_id>","similarity":<score>},...]`,
  });

  for (const comp of comps) {
    blocks.push({
      type: "text",
      text: `\nComp ID: ${comp.id} | ${comp.source} | ${comp.title.slice(0, 80)}`,
    });
    blocks.push({
      type: "image",
      source: { type: "url" as const, url: comp.imageUrl },
    });
  }

  return blocks;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const item = await prisma.item.findFirst({
    where: { id, ...ownerWhere(userId) },
    include: {
      photos: { orderBy: { order: "asc" }, take: 3 },
      comps: {
        where: { imageUrl: { not: null } },
        orderBy: { capturedAt: "desc" },
        take: 14,
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (item.photos.length === 0) {
    return NextResponse.json({ message: "No item photos to compare", updated: 0 });
  }

  const compsWithImages = item.comps.filter(
    (c): c is typeof c & { imageUrl: string } => typeof c.imageUrl === "string"
  );
  if (compsWithImages.length === 0) {
    return NextResponse.json({ message: "No comp images to rank", updated: 0 });
  }

  const anthropic = getAnthropic();
  const content = buildContent(
    item.photos.map((p) => p.url),
    compsWithImages.map((c) => ({
      id: c.id,
      title: c.title,
      source: c.source,
      imageUrl: c.imageUrl,
    }))
  );

  let scores: Array<{ id: string; similarity: number }> = [];
  try {
    const response = await anthropic.messages.create({
      model: SIM_MODEL,
      max_tokens: 800,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: [{ role: "user", content: content as any }],
    });

    const text = response.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { text: string }).text)
      .join("\n");

    const parsed = extractJsonArray(text);
    if (parsed) {
      scores = parsed.filter(
        (s): s is { id: string; similarity: number } =>
          typeof s === "object" &&
          s !== null &&
          typeof (s as Record<string, unknown>).id === "string" &&
          typeof (s as Record<string, unknown>).similarity === "number"
      );
    }
  } catch (err) {
    console.error("rank-similarity AI error:", err);
    return NextResponse.json({ error: "AI ranking failed" }, { status: 500 });
  }

  // Persist scores to DB; skip any IDs that don't belong to this item.
  const validIds = new Set(compsWithImages.map((c) => c.id));
  let updated = 0;
  for (const score of scores) {
    if (!validIds.has(score.id)) continue;
    const sim = Math.min(100, Math.max(0, Math.round(score.similarity)));
    await prisma.comp.update({ where: { id: score.id }, data: { similarity: sim } });
    updated++;
  }

  const result: Record<string, number> = {};
  for (const score of scores) {
    if (!validIds.has(score.id)) continue;
    result[score.id] = Math.min(100, Math.max(0, Math.round(score.similarity)));
  }

  return NextResponse.json({ updated, scores: result });
}
