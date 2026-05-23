import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { analyzeDeal } from "@/lib/analysis/deal";

export const runtime = "nodejs";

const patchSchema = z.object({
  askingPrice: z.number().positive().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.string().max(40).optional(),
  name: z.string().min(1).max(200).optional(),
  brand: z.string().max(120).nullable().optional(),
  model: z.string().max(120).nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  condition: z.string().max(120).nullable().optional(),
  searchQuery: z.string().max(300).nullable().optional(),
  purchasePrice: z.number().nonnegative().nullable().optional(),
  soldPrice: z.number().nonnegative().nullable().optional(),
  soldMarketplace: z.string().max(60).nullable().optional(),
  shippingCost: z.number().nonnegative().nullable().optional(),
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

  // Stamp/clear the sale date when the sold price is set or removed.
  let soldAtUpdate = {};
  if (data.soldPrice !== undefined) {
    if (data.soldPrice != null && !existing.soldAt) {
      soldAtUpdate = { soldAt: new Date() };
    } else if (data.soldPrice == null) {
      soldAtUpdate = { soldAt: null };
    }
  }

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
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.brand !== undefined ? { brand: data.brand } : {}),
      ...(data.model !== undefined ? { model: data.model } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.condition !== undefined ? { condition: data.condition } : {}),
      ...(data.searchQuery !== undefined ? { searchQuery: data.searchQuery } : {}),
      ...(data.purchasePrice !== undefined ? { purchasePrice: data.purchasePrice } : {}),
      ...(data.soldMarketplace !== undefined ? { soldMarketplace: data.soldMarketplace } : {}),
      ...(data.shippingCost !== undefined ? { shippingCost: data.shippingCost } : {}),
      ...(data.soldPrice !== undefined ? { soldPrice: data.soldPrice } : {}),
      ...soldAtUpdate,
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
