-- Indexes for the app's hottest queries. IF NOT EXISTS keeps this safe to
-- re-run against a database that may have gained some of these manually.

-- Photo.itemId FK (flagged by Supabase advisor): every list page joins the
-- first photo, and item deletes cascade through this FK.
CREATE INDEX IF NOT EXISTS "Photo_itemId_idx" ON "Photo"("itemId");

-- Home page / items API / inventory: filter by owner, newest first.
CREATE INDEX IF NOT EXISTS "Item_userId_createdAt_idx" ON "Item"("userId", "createdAt" DESC);

-- Dashboard + tax export: sold items by owner and sale date.
CREATE INDEX IF NOT EXISTS "Item_userId_soldAt_idx" ON "Item"("userId", "soldAt");

-- Expenses page + tax export: by owner, ordered/ranged on date.
CREATE INDEX IF NOT EXISTS "Expense_userId_date_idx" ON "Expense"("userId", "date");

-- Cron re-check + alerts page: watched, unsold, untriggered items ordered by
-- least-recently-updated. Partial index keeps it tiny.
CREATE INDEX IF NOT EXISTS "Item_watch_idx" ON "Item"("updatedAt")
  WHERE "alertTarget" IS NOT NULL AND "soldPrice" IS NULL AND "alertTriggeredAt" IS NULL;

-- Root-layout alert badge count: runs on every request.
CREATE INDEX IF NOT EXISTS "Item_alerted_idx" ON "Item"("userId")
  WHERE "alertTriggeredAt" IS NOT NULL;

-- The old single-column indexes are superseded by the composite ones above.
DROP INDEX IF EXISTS "Item_userId_idx";
DROP INDEX IF EXISTS "Expense_userId_idx";
