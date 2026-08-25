-- AlterTable
ALTER TABLE "PropertyListing" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featuredOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "propertyListingId" TEXT;

-- CreateTable
CREATE TABLE "MerchProduct" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'apparel',
    "priceCents" INTEGER NOT NULL,
    "photos" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sku" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "priceDeltaCents" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MerchVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchOrder" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "buyerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "shippingAddress" TEXT NOT NULL,
    "note" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "paymentMethod" TEXT,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "trackingNumber" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "name" TEXT NOT NULL,
    "variantLabel" TEXT,
    "unitCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "MerchOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchProduct_slug_key" ON "MerchProduct"("slug");

-- CreateIndex
CREATE INDEX "MerchProduct_active_sortOrder_idx" ON "MerchProduct"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "MerchVariant_productId_sortOrder_idx" ON "MerchVariant"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MerchOrder_number_key" ON "MerchOrder"("number");

-- CreateIndex
CREATE INDEX "MerchOrder_status_createdAt_idx" ON "MerchOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MerchOrder_buyerId_idx" ON "MerchOrder"("buyerId");

-- CreateIndex
CREATE INDEX "MerchOrderItem_orderId_idx" ON "MerchOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "MerchOrderItem_productId_idx" ON "MerchOrderItem"("productId");

-- AddForeignKey
ALTER TABLE "MerchVariant" ADD CONSTRAINT "MerchVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MerchProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchOrder" ADD CONSTRAINT "MerchOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchOrderItem" ADD CONSTRAINT "MerchOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MerchOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchOrderItem" ADD CONSTRAINT "MerchOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MerchProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchOrderItem" ADD CONSTRAINT "MerchOrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MerchVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_propertyListingId_fkey" FOREIGN KEY ("propertyListingId") REFERENCES "PropertyListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
