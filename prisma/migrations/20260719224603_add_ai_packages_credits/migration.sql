-- CreateTable
CREATE TABLE "AiPackage" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "tier" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "monthlyCredits" INTEGER NOT NULL DEFAULT 0,
    "creditMicroUsd" INTEGER NOT NULL DEFAULT 1000,
    "burstPercent" INTEGER NOT NULL DEFAULT 40,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiBalance" (
    "userId" TEXT NOT NULL,
    "credits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastRefillAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "packageKey" TEXT,
    "spentThisPeriod" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "periodStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiBalance_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiPackage_key_key" ON "AiPackage"("key");

-- AddForeignKey
ALTER TABLE "AiBalance" ADD CONSTRAINT "AiBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
