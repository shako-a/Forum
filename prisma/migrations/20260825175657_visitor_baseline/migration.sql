-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "visitorBaseline" INTEGER NOT NULL DEFAULT 0;

-- Seed the historical figure Google Analytics recorded before this counter
-- existed (284 as of 2026-08-25). Editable afterwards from the admin dashboard.
INSERT INTO "SiteSetting" ("id", "visitorBaseline", "updatedAt")
VALUES ('singleton', 284, NOW())
ON CONFLICT ("id") DO UPDATE SET "visitorBaseline" = 284;
