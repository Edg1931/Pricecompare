import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, the manifest, and the cron endpoint
    // (which authenticates via CRON_SECRET, not a user session).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|api/cron|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)",
  ],
};
