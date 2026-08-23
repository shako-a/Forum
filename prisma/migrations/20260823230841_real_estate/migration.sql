-- CreateTable
CREATE TABLE "PropertyListing" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "rooms" INTEGER,
    "areaSqFt" INTEGER,
    "yearBuilt" INTEGER,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT NOT NULL,
    "features" TEXT[],
    "photos" TEXT[],
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyListing_slug_key" ON "PropertyListing"("slug");

-- CreateIndex
CREATE INDEX "PropertyListing_kind_idx" ON "PropertyListing"("kind");

-- CreateIndex
CREATE INDEX "PropertyListing_propertyType_idx" ON "PropertyListing"("propertyType");

-- CreateIndex
CREATE INDEX "PropertyListing_state_idx" ON "PropertyListing"("state");

-- CreateIndex
CREATE INDEX "PropertyListing_active_createdAt_idx" ON "PropertyListing"("active", "createdAt");

-- AddForeignKey
ALTER TABLE "PropertyListing" ADD CONSTRAINT "PropertyListing_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
