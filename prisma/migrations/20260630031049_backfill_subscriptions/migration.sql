-- Backfill Subscription rows for users who were flagged Donor/Pro before the
-- subscription ledger existed. Idempotent: skips anyone who already has an
-- active subscription of that tier. Prices match TIER_PRICE_CENTS placeholders.

INSERT INTO "Subscription" ("id", "userId", "tier", "status", "priceCents", "startedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u."id", 'DONOR', 'ACTIVE', 500, u."createdAt", now(), now()
FROM "User" u
WHERE u."isDonor" = true
  AND NOT EXISTS (
    SELECT 1 FROM "Subscription" s
    WHERE s."userId" = u."id" AND s."tier" = 'DONOR' AND s."status" = 'ACTIVE'
  );

INSERT INTO "Subscription" ("id", "userId", "tier", "status", "priceCents", "startedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u."id", 'PRO', 'ACTIVE', 2000, u."createdAt", now(), now()
FROM "User" u
WHERE u."isPro" = true
  AND NOT EXISTS (
    SELECT 1 FROM "Subscription" s
    WHERE s."userId" = u."id" AND s."tier" = 'PRO' AND s."status" = 'ACTIVE'
  );