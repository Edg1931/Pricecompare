import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { repriceItem } from "@/lib/reprice";
import { hasAnthropic } from "@/lib/ai/client";
import { ownerScope, ownerWhere } from "@/lib/auth";

export const runtime = "nodejs";
// Research runs up to 90s on the primary model plus a 45s fallback — leave
// room for the eBay/Google fetches, link verification, and DB writes.
export const maxDuration = 240;

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
  const scope = await ownerScope();
  if (!scope.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owned = await prisma.item.findFirst({
    where: { id, ...ownerWhere(scope.userId) },
    select: {
      id: true,
      // Cooldown keys on the last PRICING run, not updatedAt — editing notes,
      // asking price, or brand/model bumps updatedAt and used to lock the
      // "Save & re-price" flow out with its own cooldown.
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cooldown: a reanalyze costs a full web-search research run (~$0.05-0.15).
  // Re-pricing less than 2 minutes after the last pricing run is never useful
  // — block rapid re-clicks and accidental double-submits.
  const lastPriced = owned.snapshots[0]?.createdAt;
  if (lastPriced && Date.now() - lastPriced.getTime() < 2 * 60 * 1000) {
    return NextResponse.json(
      { error: "This item was just analyzed. Wait a couple of minutes before re-analyzing." },
      { status: 429 }
    );
  }

  try {
    const result = await repriceItem(id);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ id });
  } catch (err) {
    console.error("Reanalyze failed:", err);
    const message = err instanceof Error ? err.message : "Reanalysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
