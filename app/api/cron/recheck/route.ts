import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { repriceItem } from "@/lib/reprice";
import { hasAnthropic } from "@/lib/ai/client";

export const runtime = "nodejs";
export const maxDuration = 60;

// Re-checks watched items (those with a price alert set) and trips alerts that
// have crossed their target. Runs 3 reprices in parallel (each ~30-45 s) so we
// can clear ~3 items per cron invocation instead of 1.
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

  // Fetch a larger pool and work through as many as fit in the time budget.
  // oldest-checked first ensures fairness across all watched items.
  const items = await prisma.item.findMany({
    where: { alertTarget: { not: null }, soldPrice: null, alertTriggeredAt: null },
    orderBy: { updatedAt: "asc" },
    take: 50,
    select: { id: true },
  });

  const start = Date.now();
  let checked = 0;
  const CONCURRENCY = 3;

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    if (Date.now() - start > 45_000) break;
    const batch = items.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((it) => repriceItem(it.id)));
    for (const r of results) {
      if (r.status === "fulfilled") {
        checked += 1;
      } else {
        console.error("Re-check failed:", r.reason);
      }
    }
  }

  const queued = Math.max(0, items.length - checked);
  return NextResponse.json({ checked, queued });
}
