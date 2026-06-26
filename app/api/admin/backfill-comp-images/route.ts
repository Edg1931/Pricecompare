import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchEbayItemImage, hasEbay } from "@/lib/pricing/ebay";

export const runtime = "nodejs";
export const maxDuration = 60;

// One-time (or one-per-batch) job to fill in `imageUrl` on existing Comp rows
// that were created before the image-saving code shipped. Iterates eBay comps
// with a URL but no image, looks each one up against eBay's Browse API, and
// updates the row. Works within Vercel's 60s function ceiling and processes
// whatever fits; call it again until `queued` is 0.
//
// Trigger: POST with `Authorization: Bearer $CRON_SECRET`. The secret is
// required (no anonymous access — this both writes to the DB and burns eBay
// API quota).
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set — refusing to run an unauthenticated mutation" },
      { status: 503 }
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasEbay()) {
    return NextResponse.json({ error: "eBay not configured" }, { status: 503 });
  }

  const comps = await prisma.comp.findMany({
    where: { source: "ebay", imageUrl: null, url: { not: null } },
    select: { id: true, url: true },
    take: 100,
    orderBy: { id: "asc" },
  });

  const start = Date.now();
  let attempted = 0;
  let updated = 0;
  let skippedNoImage = 0;
  for (const c of comps) {
    if (Date.now() - start > 50_000) break;
    if (!c.url) continue;
    attempted++;
    try {
      const imageUrl = await fetchEbayItemImage(c.url);
      if (imageUrl) {
        await prisma.comp.update({
          where: { id: c.id },
          data: { imageUrl },
        });
        updated++;
      } else {
        skippedNoImage++;
      }
    } catch (err) {
      console.error("Backfill failed for comp", c.id, err);
      skippedNoImage++;
    }
  }

  return NextResponse.json({
    attempted,
    updated,
    skippedNoImage,
    remaining: comps.length - attempted,
    note:
      comps.length === 100 && attempted === 100
        ? "Hit the batch ceiling — re-run to keep going."
        : undefined,
  });
}
