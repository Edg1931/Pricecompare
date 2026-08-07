import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  // 303 forces the follow-up request to GET — the default 307 preserves the
  // form's POST and /login only serves GET, which 405s the sign-out.
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
