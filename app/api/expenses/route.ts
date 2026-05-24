import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { expenseAmount } from "@/lib/expenses";
import { currentUserId, ownerWhere } from "@/lib/auth";
import { authEnabled } from "@/lib/supabase/config";

export const runtime = "nodejs";

const createSchema = z.object({
  date: z.string().optional(),
  type: z.enum(["mileage", "supplies", "shipping", "fees", "other"]),
  description: z.string().max(300).nullable().optional(),
  amount: z.number().nonnegative().nullable().optional(),
  miles: z.number().nonnegative().nullable().optional(),
});

export async function GET() {
  const userId = await currentUserId();
  const expenses = await prisma.expense.findMany({
    where: ownerWhere(userId),
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ expenses });
}

export async function POST(req: Request) {
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid expense." }, { status: 400 });
  }
  const userId = await currentUserId();
  if (authEnabled() && !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const d = parsed.data;
  const amount = expenseAmount(d.type, d.amount ?? null, d.miles ?? null);
  const expense = await prisma.expense.create({
    data: {
      userId,
      date: d.date ? new Date(d.date) : new Date(),
      type: d.type,
      description: d.description ?? null,
      amount,
      miles: d.miles ?? null,
    },
  });
  return NextResponse.json({ expense }, { status: 201 });
}
