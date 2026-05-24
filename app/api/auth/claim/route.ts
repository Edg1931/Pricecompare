import { NextResponse } from "next/server";
import { getUser, claimOrphansIfOwner } from "@/lib/auth";

export const runtime = "nodejs";

// Called right after a password sign-in to claim pre-auth records for the owner.
export async function POST() {
  const user = await getUser();
  if (user) await claimOrphansIfOwner(user);
  return NextResponse.json({ ok: true });
}
