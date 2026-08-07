-- New-vs-resale feature: what the item sells for NEW right now, plus a
-- per-marketplace median snapshot so the item page can show current pricing
-- on each platform. IF NOT EXISTS keeps this safe to re-run.
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "retailPrice" DOUBLE PRECISION;
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "retailNote" TEXT;
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "bySource" TEXT;
