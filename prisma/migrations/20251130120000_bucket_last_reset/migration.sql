-- Add lastResetAt to buckets
ALTER TABLE "Bucket" ADD COLUMN "lastResetAt" TIMESTAMP(3);

-- Backfill existing buckets
UPDATE "Bucket"
SET "lastResetAt" = COALESCE("periodStart", "createdAt")
WHERE "lastResetAt" IS NULL;
