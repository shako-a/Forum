-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameKa" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#1f4e9c',
    "background" TEXT NOT NULL DEFAULT '#eaf1fb',
    "font" TEXT NOT NULL DEFAULT 'body',
    "bold" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserLabels" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserLabels_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Label_sortOrder_idx" ON "Label"("sortOrder");

-- CreateIndex
CREATE INDEX "_UserLabels_B_index" ON "_UserLabels"("B");

-- AddForeignKey
ALTER TABLE "_UserLabels" ADD CONSTRAINT "_UserLabels_A_fkey" FOREIGN KEY ("A") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserLabels" ADD CONSTRAINT "_UserLabels_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
