-- CreateTable
CREATE TABLE "VisitorDay" (
    "hash" TEXT NOT NULL,
    "day" TEXT NOT NULL,

    CONSTRAINT "VisitorDay_pkey" PRIMARY KEY ("hash","day")
);

-- CreateIndex
CREATE INDEX "VisitorDay_day_idx" ON "VisitorDay"("day");
