-- Add visual similarity score to Comp rows (set by the rank-similarity API)
ALTER TABLE "Comp" ADD COLUMN IF NOT EXISTS "similarity" INTEGER;
