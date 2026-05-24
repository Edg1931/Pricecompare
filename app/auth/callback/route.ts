import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUser, claimOrphansIfOwner } from "@/lib/auth";

export const runtime = "nodejs";

// Handles the OAuth (Google) redirect and email-confirmation links.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
    const user = await getUser();
    if (user) await claimOrphansIfOwner(user);
  }

  return NextResponse.redirect(`${origin}/`);
}
