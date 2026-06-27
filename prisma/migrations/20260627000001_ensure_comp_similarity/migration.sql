-- Idempotent re-application: ensures the similarity column exists even if the
-- prior migration (20260626000000) was tracked in _prisma_migrations without
-- actually being executed against the database.
ALTER TABLE "Comp" ADD COLUMN IF NOT EXISTS "similarity" INTEGER;
