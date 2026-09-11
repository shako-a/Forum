-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "category" TEXT;

-- CreateIndex
CREATE INDEX "JobPosting_category_active_idx" ON "JobPosting"("category", "active");
