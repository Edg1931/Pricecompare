-- Persist the barcode UPC so repricing keeps exact-product search behavior.
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "upc" TEXT;
