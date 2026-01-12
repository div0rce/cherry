-- Enforce monotonic timestamps for state-machine fields.
UPDATE "CherryPointLedger"
SET "postedAt" = "createdAt"
WHERE "postedAt" IS NOT NULL
  AND "postedAt" < "createdAt";

UPDATE "CherryPointLedger"
SET "revokedAt" = "createdAt"
WHERE "revokedAt" IS NOT NULL
  AND "revokedAt" < "createdAt";

UPDATE "RecommendationSession"
SET "verifiedAt" = "createdAt"
WHERE "verifiedAt" IS NOT NULL
  AND "verifiedAt" < "createdAt";

UPDATE "RecommendationSession"
SET "rejectedAt" = "createdAt"
WHERE "rejectedAt" IS NOT NULL
  AND "rejectedAt" < "createdAt";

ALTER TABLE "CherryPointLedger"
ADD CONSTRAINT "cherry_point_ledger__posted_at__check"
CHECK ("postedAt" IS NULL OR "postedAt" >= "createdAt");

ALTER TABLE "CherryPointLedger"
ADD CONSTRAINT "cherry_point_ledger__revoked_at__check"
CHECK ("revokedAt" IS NULL OR "revokedAt" >= "createdAt");

ALTER TABLE "RecommendationSession"
ADD CONSTRAINT "recommendation_session__verified_at__check"
CHECK ("verifiedAt" IS NULL OR "verifiedAt" >= "createdAt");

ALTER TABLE "RecommendationSession"
ADD CONSTRAINT "recommendation_session__rejected_at__check"
CHECK ("rejectedAt" IS NULL OR "rejectedAt" >= "createdAt");
