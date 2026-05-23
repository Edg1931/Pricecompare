import { NextResponse } from "next/server";
import { z } from "zod";
import { identifyLot } from "@/lib/ai/vision";
import { hasAnthropic } from "@/lib/ai/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  images: z.array(z.string()).min(1).max(8),
  hint: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  if (!hasAnthropic()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "At least one photo is required." }, { status: 400 });
  }

  try {
    const items = await identifyLot(parsed.data.images, parsed.data.hint);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Lot identify failed:", err);
    const message = err instanceof Error ? err.message : "Identification failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
