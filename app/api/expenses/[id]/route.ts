import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUserId, ownerWhere } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await currentUserId();
  await prisma.expense.deleteMany({ where: { id, ...ownerWhere(userId) } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
