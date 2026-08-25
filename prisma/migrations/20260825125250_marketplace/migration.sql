-- CreateTable
CREATE TABLE "MarketListing" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerBusinessId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "priceType" TEXT NOT NULL DEFAULT 'FIXED',
    "photos" TEXT[],
    "city" TEXT,
    "state" TEXT NOT NULL,
    "localPickup" BOOLEAN NOT NULL DEFAULT true,
    "canShip" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "bumpedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketFavorite" (
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketFavorite_pkey" PRIMARY KEY ("userId","listingId")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketListing_slug_key" ON "MarketListing"("slug");

-- CreateIndex
CREATE INDEX "MarketListing_status_bumpedAt_idx" ON "MarketListing"("status", "bumpedAt");

-- CreateIndex
CREATE INDEX "MarketListing_category_idx" ON "MarketListing"("category");

-- CreateIndex
CREATE INDEX "MarketListing_state_idx" ON "MarketListing"("state");

-- CreateIndex
CREATE INDEX "MarketListing_sellerId_idx" ON "MarketListing"("sellerId");

-- CreateIndex
CREATE INDEX "MarketFavorite_listingId_idx" ON "MarketFavorite"("listingId");

-- AddForeignKey
ALTER TABLE "MarketListing" ADD CONSTRAINT "MarketListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketListing" ADD CONSTRAINT "MarketListing_sellerBusinessId_fkey" FOREIGN KEY ("sellerBusinessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketFavorite" ADD CONSTRAINT "MarketFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketFavorite" ADD CONSTRAINT "MarketFavorite_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
