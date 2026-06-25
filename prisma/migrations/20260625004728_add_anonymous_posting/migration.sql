-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "anonAlias" INTEGER;

-- AlterTable
ALTER TABLE "Reply" ADD COLUMN     "anonAlias" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isOwner" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "revealAnonymousToStaff" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);
