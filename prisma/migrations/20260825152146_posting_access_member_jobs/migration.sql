-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "jobType" TEXT,
ADD COLUMN     "pay" TEXT,
ADD COLUMN     "posterId" TEXT,
ALTER COLUMN "businessId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "postingAuto" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN     "postingEstate" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN     "postingJobs" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN     "postingMarket" TEXT NOT NULL DEFAULT 'all';

-- CreateIndex
CREATE INDEX "JobPosting_posterId_idx" ON "JobPosting"("posterId");

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
