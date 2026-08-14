/*
  Warnings:

  - You are about to drop the column `credits` on the `AiBalance` table. All the data in the column will be lost.
  - You are about to drop the column `spentThisPeriod` on the `AiBalance` table. All the data in the column will be lost.
  - You are about to drop the column `burstPercent` on the `AiPackage` table. All the data in the column will be lost.
  - You are about to drop the column `creditMicroUsd` on the `AiPackage` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyCredits` on the `AiPackage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AiBalance" DROP COLUMN "credits",
DROP COLUMN "spentThisPeriod",
ADD COLUMN     "balanceMicroUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "carriedInMicroUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "spentThisPeriodMicroUsd" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "AiPackage" DROP COLUMN "burstPercent",
DROP COLUMN "creditMicroUsd",
DROP COLUMN "monthlyCredits",
ADD COLUMN     "monthlyBudgetMicroUsd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rolloverPercent" INTEGER NOT NULL DEFAULT 50;
