-- AlterTable
ALTER TABLE "User" ADD COLUMN     "themeAccent" TEXT,
ADD COLUMN     "themeDensity" TEXT NOT NULL DEFAULT 'comfortable',
ADD COLUMN     "themeDepth" TEXT NOT NULL DEFAULT 'full',
ADD COLUMN     "themePalette" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "themeRadius" TEXT NOT NULL DEFAULT 'rounded';
