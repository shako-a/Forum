-- AlterEnum
ALTER TYPE "PostKind" ADD VALUE 'JOB';

-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "discussionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "JobPosting_discussionId_key" ON "JobPosting"("discussionId");

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

