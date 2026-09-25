-- Open house: guests read locked topics too. Off by default in the schema;
-- switched ON here because that is what this change was asked for. An admin
-- turns it back off from Admin → More, which needs no deploy.
ALTER TABLE "SiteSetting" ADD COLUMN "openToGuests" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "SiteSetting" ("id", "openToGuests", "updatedAt")
VALUES ('singleton', true, NOW())
ON CONFLICT ("id") DO UPDATE SET "openToGuests" = true, "updatedAt" = NOW();
