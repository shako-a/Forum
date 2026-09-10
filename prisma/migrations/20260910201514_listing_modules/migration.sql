-- DropIndex
DROP INDEX "Business_featured_idx";

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bookingUrl" TEXT,
ADD COLUMN     "details" JSONB,
ADD COLUMN     "featuredOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "languages" TEXT[],
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "paymentMethods" TEXT[],
ADD COLUMN     "socialFacebook" TEXT,
ADD COLUMN     "socialInstagram" TEXT,
ADD COLUMN     "socialTelegram" TEXT,
ADD COLUMN     "socialTiktok" TEXT,
ADD COLUMN     "socialYoutube" TEXT,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "whatsapp" TEXT,
ADD COLUMN     "zip" TEXT;

-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featuredOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MarketListing" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featuredOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ListingInteraction" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "listingTitle" TEXT NOT NULL,
    "listingSlug" TEXT NOT NULL,
    "businessId" TEXT,
    "recipientId" TEXT,
    "senderId" TEXT,
    "kind" TEXT NOT NULL,
    "conversationId" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingInteraction_businessId_createdAt_idx" ON "ListingInteraction"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingInteraction_module_listingId_createdAt_idx" ON "ListingInteraction"("module", "listingId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingInteraction_recipientId_createdAt_idx" ON "ListingInteraction"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingInteraction_kind_createdAt_idx" ON "ListingInteraction"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "ListingInteraction_createdAt_idx" ON "ListingInteraction"("createdAt");

-- CreateIndex
CREATE INDEX "Business_featured_featuredOrder_idx" ON "Business"("featured", "featuredOrder");

-- CreateIndex
CREATE INDEX "Business_lat_lng_idx" ON "Business"("lat", "lng");

-- AddForeignKey
ALTER TABLE "ListingInteraction" ADD CONSTRAINT "ListingInteraction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingInteraction" ADD CONSTRAINT "ListingInteraction_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingInteraction" ADD CONSTRAINT "ListingInteraction_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
