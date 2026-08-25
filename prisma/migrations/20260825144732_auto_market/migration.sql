-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "autoListingId" TEXT;

-- CreateTable
CREATE TABLE "AutoListing" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "makeOther" TEXT,
    "model" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyType" TEXT,
    "mileage" INTEGER,
    "transmission" TEXT,
    "fuel" TEXT,
    "drivetrain" TEXT,
    "color" TEXT,
    "condition" TEXT NOT NULL DEFAULT 'USED',
    "vin" TEXT,
    "price" INTEGER NOT NULL,
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "insured" BOOLEAN NOT NULL DEFAULT false,
    "minRentalDays" INTEGER,
    "depositAmount" INTEGER,
    "description" TEXT,
    "features" TEXT[],
    "photos" TEXT[],
    "city" TEXT,
    "zip" TEXT,
    "state" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "removedReason" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featuredOrder" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutoListing_slug_key" ON "AutoListing"("slug");

-- CreateIndex
CREATE INDEX "AutoListing_kind_idx" ON "AutoListing"("kind");

-- CreateIndex
CREATE INDEX "AutoListing_make_idx" ON "AutoListing"("make");

-- CreateIndex
CREATE INDEX "AutoListing_status_createdAt_idx" ON "AutoListing"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AutoListing_state_idx" ON "AutoListing"("state");

-- CreateIndex
CREATE INDEX "AutoListing_lat_lng_idx" ON "AutoListing"("lat", "lng");

-- CreateIndex
CREATE INDEX "AutoListing_ownerId_idx" ON "AutoListing"("ownerId");

-- AddForeignKey
ALTER TABLE "AutoListing" ADD CONSTRAINT "AutoListing_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_autoListingId_fkey" FOREIGN KEY ("autoListingId") REFERENCES "AutoListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
