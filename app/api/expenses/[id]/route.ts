import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ownerScope, ownerWhere } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scope = await ownerScope();
  if (!scope.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.expense.deleteMany({ where: { id, ...ownerWhere(scope.userId) } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
