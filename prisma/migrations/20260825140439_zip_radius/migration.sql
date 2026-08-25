-- AlterTable
ALTER TABLE "MarketListing" ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "localDelivery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "zip" TEXT;

-- AlterTable
ALTER TABLE "PropertyListing" ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "zip" TEXT;

-- CreateIndex
CREATE INDEX "MarketListing_lat_lng_idx" ON "MarketListing"("lat", "lng");

-- CreateIndex
CREATE INDEX "PropertyListing_lat_lng_idx" ON "PropertyListing"("lat", "lng");
