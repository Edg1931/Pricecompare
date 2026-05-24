import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { claimOrphansIfOwner } from "@/lib/auth";

export const runtime = "nodejs";

// Handles the OAuth (Google) redirect and email-confirmation links. Cookies
// must be written onto the redirect Response itself so the browser receives
// the session and the middleware sees the user on the next request.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;

  if (!code) return NextResponse.redirect(`${origin}/login`);

  const response = NextResponse.redirect(`${origin}/`);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }
  if (data.user) {
    await claimOrphansIfOwner({ id: data.user.id, email: data.user.email ?? null });
  }
  return response;
}
