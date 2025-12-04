-- Ensure postedAt is populated from occurredAt for existing rows
UPDATE "BankTransaction"
SET "postedAt" = COALESCE("postedAt", "occurredAt")
WHERE "postedAt" IS NULL;

-- Make postedAt required
ALTER TABLE "BankTransaction"
ALTER COLUMN "postedAt" SET NOT NULL;

-- Optional: allow occurredAt to be null going forward (timeline uses postedAt)
ALTER TABLE "BankTransaction"
ALTER COLUMN "occurredAt" DROP NOT NULL;
