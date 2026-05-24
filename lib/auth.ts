import { prisma } from "@/lib/db";
import { authEnabled, OWNER_EMAIL } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string | null;
}

/** The signed-in user, or null (also null when auth is not configured). */
export async function getUser(): Promise<CurrentUser | null> {
  if (!authEnabled()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

/** The id to scope DB queries by, or null when auth is disabled. */
export async function currentUserId(): Promise<string | null> {
  const user = await getUser();
  return user?.id ?? null;
}

/**
 * Prisma `where` fragment that scopes to the owner. When auth is off
 * (userId null) it returns an empty filter, preserving open-mode behavior.
 */
export function ownerWhere(userId: string | null) {
  return userId ? { userId } : {};
}

/** One-time: assign pre-auth (orphaned) records to the owner on first login. */
export async function claimOrphansIfOwner(user: CurrentUser): Promise<void> {
  if (!user.email || user.email.toLowerCase() !== OWNER_EMAIL) return;
  const orphans = await prisma.item.count({ where: { userId: null } });
  const orphanExpenses = await prisma.expense.count({ where: { userId: null } });
  if (orphans === 0 && orphanExpenses === 0) return;
  await prisma.item.updateMany({ where: { userId: null }, data: { userId: user.id } });
  await prisma.expense.updateMany({ where: { userId: null }, data: { userId: user.id } });
}
