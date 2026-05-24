// Auth is active only once the Supabase public env vars are configured, so
// the app keeps working in open mode until you finish setup in Vercel.
export function authEnabled(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Existing (pre-auth) items/expenses are claimed by this account on first login.
export const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "edg1931@gmail.com").toLowerCase();
