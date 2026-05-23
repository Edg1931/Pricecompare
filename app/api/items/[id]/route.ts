import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { analyzeDeal } from "@/lib/analysis/deal";

export const runtime = "nodejs";

const patchSchema = z.object({
  askingPrice: z.number().positive().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.string().max(40).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: { photos: { orderBy: { order: "asc" } }, comps: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const data = parsed.data;

  // If the asking price changed, recompute the deal locally (no new AI calls).
  let dealUpdate = {};
  if ("askingPrice" in data) {
    const deal = analyzeDeal(existing.recommendedMedian, data.askingPrice ?? null);
    dealUpdate = {
      dealScore: deal.dealScore,
      verdict: deal.verdict,
      analysisSummary: deal.summary,
      bestPlatform: deal.bestPlatform,
      netProceeds: JSON.stringify(deal.netProceeds),
    };
  }

  const updated = await prisma.item.update({
    where: { id },
    data: {
      ...(data.askingPrice !== undefined ? { askingPrice: data.askingPrice } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...dealUpdate,
    },
  });
  return NextResponse.json({ item: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.item.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
