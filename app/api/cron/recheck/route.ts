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
  // Database keep-alive: Supabase's free tier pauses projects after ~a week
  // without database activity, which has twice taken down auth + data for
  // this app (DNS_PROBE_FINISHED_NXDOMAIN on login). Vercel invokes this
  // route daily regardless of CRON_SECRET, so a trivial query on those
  // invocations keeps the project awake even while the paid repricing work
  // below stays locked. Gated to scheduler/authorized calls so an arbitrary
  // unauthenticated client can't use this route to spin up DB connections
  // (Vercel cron requests carry the vercel-cron user-agent; spoofing it
  // only buys a SELECT 1, but the drive-by path stays database-free).
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const authorized = Boolean(secret && auth === `Bearer ${secret}`);
  const isVercelCron = (req.headers.get("user-agent") ?? "")
    .toLowerCase()
    .includes("vercel-cron");
  let keepAlive = false;
  if (authorized || isVercelCron) {
    keepAlive = await prisma
      .$queryRaw`SELECT 1`
      .then(() => true)
      .catch((err) => {
        console.error("Keep-alive query failed:", err);
        return false;
      });
  }

  // Fail closed: this endpoint burns AI spend (up to 50 web-search reprices),
  // so it must never run unauthenticated. Same pattern as the backfill route.
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured — refusing to reprice.", keepAlive },
      { status: 503 }
    );
  }
  if (!authorized) {
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

  // Only start a new batch if the worst-case batch (~160s: the research
  // cascade's 150s global deadline + fetches, verification, and DB writes)
  // still fits inside maxDuration. Starting a batch we can't finish means
  // Vercel kills the function mid-write.
  const BUDGET_MS = (maxDuration - 165) * 1000;

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
