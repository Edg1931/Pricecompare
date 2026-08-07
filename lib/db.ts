import { PrismaClient } from "@prisma/client";

/**
 * Supabase's connection pooler (pgbouncer in transaction mode) shuffles
 * clients between server connections, so Prisma's prepared statements
 * collide across requests: PostgresError 42P05 "prepared statement s1
 * already exists". `pgbouncer=true` makes Prisma skip prepared statements.
 * Applied automatically whenever DATABASE_URL points at a pooled Supabase
 * host so the fix can't regress via env edits; direct (5432) connections
 * are left untouched. Migrations use DIRECT_URL and are unaffected.
 */
function resolveDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    const pooled =
      u.hostname.includes("pooler.supabase") || u.port === "6543";
    if (pooled && !u.searchParams.has("pgbouncer")) {
      u.searchParams.set("pgbouncer", "true");
      // One connection per serverless instance keeps N instances from
      // exhausting the pooler's client slots.
      if (!u.searchParams.has("connection_limit")) {
        u.searchParams.set("connection_limit", "1");
      }
    }
    return u.toString();
  } catch {
    return raw;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
