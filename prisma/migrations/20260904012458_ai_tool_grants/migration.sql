-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiAsk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiFirstGrantedAt" TIMESTAMP(3),
ADD COLUMN     "aiTranslate" BOOLEAN NOT NULL DEFAULT false;
