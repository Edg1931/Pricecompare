import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { repriceItem } from "@/lib/reprice";
import { hasAnthropic } from "@/lib/ai/client";

export const runtime = "nodejs";
export const maxDuration = 60;

// Re-checks watched items (those with a price alert set) and trips alerts that
// have crossed their target. Each re-price is slow (~30-45s), so we work
// within a wall-clock budget and process whatever fits; the rest are picked up
// on the next run (oldest-checked first).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  if (!hasAnthropic()) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const items = await prisma.item.findMany({
    where: { alertTarget: { not: null }, soldPrice: null, alertTriggeredAt: null },
    orderBy: { updatedAt: "asc" },
    take: 5,
    select: { id: true },
  });

  const start = Date.now();
  let checked = 0;
  for (const it of items) {
    if (Date.now() - start > 45_000) break; // leave headroom under maxDuration
    try {
      await repriceItem(it.id);
      checked += 1;
    } catch (err) {
      console.error("Re-check failed for", it.id, err);
    }
  }

  return NextResponse.json({ checked, queued: items.length });
}
