import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { repriceItem } from "@/lib/reprice";
import { hasAnthropic } from "@/lib/ai/client";

export const runtime = "nodejs";
export const maxDuration = 300;

// Re-checks watched items (those with a price alert set) and trips alerts that
// have crossed their target. Runs 3 reprices in parallel (each ~30-45 s) so we
// can clear ~3 items per cron invocation instead of 1.
export async function GET(req: Request) {
  // Fail closed: this endpoint burns AI spend (up to 50 web-search reprices),
  // so it must never run unauthenticated. Same pattern as the backfill route.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured — refusing to run." },
      { status: 503 }
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  let errors = 0;
  const CONCURRENCY = 3;

  // Only start a new batch if the worst-case batch (~150s: 90s primary
  // research + 45s fallback + fetches, verification, and DB writes) still
  // fits inside maxDuration. Starting a batch we can't finish means Vercel
  // kills the function mid-write.
  const BUDGET_MS = (maxDuration - 155) * 1000;

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    if (Date.now() - start > BUDGET_MS) break;
    const batch = items.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((it) => repriceItem(it.id)));
    for (const r of results) {
      if (r.status === "fulfilled") {
        checked += 1;
      } else {
        console.error("Re-check failed:", r.reason);
        errors += 1;
      }
    }
  }

  const durationMs = Date.now() - start;
  await prisma.cronLog.create({ data: { checked, queued: Math.max(0, items.length - checked), errors, durationMs } }).catch((err) => console.error("CronLog write failed:", err));

  const queued = Math.max(0, items.length - checked);
  return NextResponse.json({ checked, queued, durationMs });
}
