-- AlterTable
ALTER TABLE "MarketListing" ADD COLUMN     "removedReason" TEXT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "marketListingId" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" TEXT;

-- CreateTable
CREATE TABLE "MarketSellerReview" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "listingId" TEXT,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketSellerReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketSellerReview_sellerId_createdAt_idx" ON "MarketSellerReview"("sellerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketSellerReview_sellerId_reviewerId_key" ON "MarketSellerReview"("sellerId", "reviewerId");

-- CreateIndex
CREATE INDEX "Report_marketListingId_idx" ON "Report"("marketListingId");

-- AddForeignKey
ALTER TABLE "MarketSellerReview" ADD CONSTRAINT "MarketSellerReview_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSellerReview" ADD CONSTRAINT "MarketSellerReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSellerReview" ADD CONSTRAINT "MarketSellerReview_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_marketListingId_fkey" FOREIGN KEY ("marketListingId") REFERENCES "MarketListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
