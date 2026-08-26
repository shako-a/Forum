-- CreateEnum
CREATE TYPE "PostKind" AS ENUM ('DISCUSSION', 'EVENT');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('GOING', 'INTERESTED', 'NOT_GOING');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "eventEndsAt" TIMESTAMP(3),
ADD COLUMN     "eventLocation" TEXT,
ADD COLUMN     "eventStartsAt" TIMESTAMP(3),
ADD COLUMN     "eventUrl" TEXT,
ADD COLUMN     "kind" "PostKind" NOT NULL DEFAULT 'DISCUSSION';

-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "eventsLabelId" TEXT,
ADD COLUMN     "eventsMode" TEXT NOT NULL DEFAULT 'verified';

-- CreateTable
CREATE TABLE "EventRsvp" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RsvpStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRsvp_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateIndex
CREATE INDEX "EventRsvp_postId_status_idx" ON "EventRsvp"("postId", "status");

-- CreateIndex
CREATE INDEX "EventRsvp_userId_createdAt_idx" ON "EventRsvp"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_kind_eventStartsAt_idx" ON "Post"("kind", "eventStartsAt");

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

