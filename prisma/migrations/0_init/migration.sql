-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "category" TEXT,
    "condition" TEXT,
    "attributes" TEXT,
    "identConfidence" DOUBLE PRECISION,
    "identNotes" TEXT,
    "searchQuery" TEXT,
    "recommendedLow" DOUBLE PRECISION,
    "recommendedMedian" DOUBLE PRECISION,
    "recommendedHigh" DOUBLE PRECISION,
    "priceConfidence" DOUBLE PRECISION,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "marketContext" TEXT,
    "askingPrice" DOUBLE PRECISION,
    "dealScore" INTEGER,
    "verdict" TEXT,
    "bestPlatform" TEXT,
    "netProceeds" TEXT,
    "analysisSummary" TEXT,
    "listingTitle" TEXT,
    "listingDescription" TEXT,
    "priceTrend" TEXT,
    "demand" TEXT,
    "alertTarget" DOUBLE PRECISION,
    "alertDirection" TEXT,
    "alertTriggeredAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'analyzed',
    "notes" TEXT,
    "storageLocation" TEXT,
    "purchasePrice" DOUBLE PRECISION,
    "boughtAt" TIMESTAMP(3),
    "soldPrice" DOUBLE PRECISION,
    "soldMarketplace" TEXT,
    "soldFees" DOUBLE PRECISION,
    "shippingCost" DOUBLE PRECISION,
    "soldAt" TIMESTAMP(3),

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "mileageRate" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "defaultMarketplace" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL DEFAULT 'other',
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "miles" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "low" DOUBLE PRECISION,
    "median" DOUBLE PRECISION,
    "high" DOUBLE PRECISION,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comp" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "url" TEXT,
    "condition" TEXT,
    "listingType" TEXT NOT NULL DEFAULT 'active',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_userId_idx" ON "Item"("userId");

-- CreateIndex
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_itemId_idx" ON "PriceSnapshot"("itemId");

-- CreateIndex
CREATE INDEX "Comp_itemId_idx" ON "Comp"("itemId");

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comp" ADD CONSTRAINT "Comp_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
