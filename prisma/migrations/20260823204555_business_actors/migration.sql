-- AlterTable
ALTER TABLE "BusinessReview" ADD COLUMN     "ownerReply" TEXT,
ADD COLUMN     "ownerReplyAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "authorBusinessId" TEXT;

-- AlterTable
ALTER TABLE "Reply" ADD COLUMN     "authorBusinessId" TEXT;

-- CreateTable
CREATE TABLE "BusinessManager" (
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessManager_pkey" PRIMARY KEY ("businessId","userId")
);

-- CreateIndex
CREATE INDEX "BusinessManager_userId_idx" ON "BusinessManager"("userId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorBusinessId_fkey" FOREIGN KEY ("authorBusinessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_authorBusinessId_fkey" FOREIGN KEY ("authorBusinessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessManager" ADD CONSTRAINT "BusinessManager_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessManager" ADD CONSTRAINT "BusinessManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
