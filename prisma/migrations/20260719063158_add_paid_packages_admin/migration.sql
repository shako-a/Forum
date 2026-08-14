-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');

-- CreateTable
CREATE TABLE "PaidPackage" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "nameEn" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "blurbEn" TEXT NOT NULL,
    "blurbKa" TEXT NOT NULL,
    "pitchEn" TEXT NOT NULL,
    "pitchKa" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '✦',
    "accent" TEXT NOT NULL DEFAULT '#1f4e9c',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "discountType" "DiscountType",
    "discountPercent" INTEGER,
    "discountPriceCents" INTEGER,
    "discountStartsAt" TIMESTAMP(3),
    "discountEndsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaidPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageFeature" (
    "packageId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PackageFeature_pkey" PRIMARY KEY ("packageId","featureId")
);

-- CreateTable
CREATE TABLE "UserPackage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaidPackage_key_key" ON "PaidPackage"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PaidPackage_slug_key" ON "PaidPackage"("slug");

-- CreateIndex
CREATE INDEX "PaidPackage_isActive_sortOrder_idx" ON "PaidPackage"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_key_key" ON "Feature"("key");

-- CreateIndex
CREATE INDEX "Feature_isActive_sortOrder_idx" ON "Feature"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "PackageFeature_featureId_idx" ON "PackageFeature"("featureId");

-- CreateIndex
CREATE INDEX "UserPackage_userId_idx" ON "UserPackage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPackage_userId_packageId_key" ON "UserPackage"("userId", "packageId");

-- AddForeignKey
ALTER TABLE "PackageFeature" ADD CONSTRAINT "PackageFeature_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PaidPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageFeature" ADD CONSTRAINT "PackageFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPackage" ADD CONSTRAINT "UserPackage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPackage" ADD CONSTRAINT "UserPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PaidPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
