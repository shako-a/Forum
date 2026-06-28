-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "featuredInBar" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "popularBarSize" INTEGER NOT NULL DEFAULT 6;

-- CreateIndex
CREATE INDEX "Post_featuredInBar_idx" ON "Post"("featuredInBar");
