import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth";
import { authEnabled } from "@/lib/supabase/config";
import { saveSettings } from "@/lib/settings";

export const runtime = "nodejs";

const schema = z.object({
  taxRate: z.number().min(0).max(0.95).optional(),
  mileageRate: z.number().min(0).max(5).optional(),
  defaultMarketplace: z.string().max(60).nullable().optional(),
});

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (authEnabled() && !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
  }
  await saveSettings(userId, parsed.data);
  return NextResponse.json({ ok: true });
}
