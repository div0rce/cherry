-- AlterTable
ALTER TABLE "Bucket" ADD COLUMN     "periodEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "spentCents" INTEGER NOT NULL DEFAULT 0;

-- Backfill spentCents and period windows from existing data.
UPDATE "Bucket"
SET
  "spentCents" = GREATEST("budgetAmount" - "currentAmount", 0),
  "periodStart" = CASE
    WHEN "period" = 'WEEKLY' THEN date_trunc('week', "createdAt")
    WHEN "period" = 'MONTHLY' THEN date_trunc('month', "createdAt")
    ELSE date_trunc('day', "createdAt")
  END,
  "periodEnd" = CASE
    WHEN "period" = 'WEEKLY' THEN date_trunc('week', "createdAt") + interval '7 days'
    WHEN "period" = 'MONTHLY' THEN date_trunc('month', "createdAt") + interval '1 month'
    ELSE date_trunc('day', "createdAt") + interval '1 day'
  END;
