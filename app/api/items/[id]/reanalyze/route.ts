import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { repriceItem } from "@/lib/reprice";
import { hasAnthropic } from "@/lib/ai/client";
import { currentUserId, ownerWhere } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  const userId = await currentUserId();
  const owned = await prisma.item.findFirst({
    where: { id, ...ownerWhere(userId) },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
