-- Ensure amountMinor and description are populated for existing rows
UPDATE "BankTransaction"
SET "amountMinor" = COALESCE(
    "amountMinor",
    CASE
      WHEN LOWER("direction") = 'credit' THEN CAST("amount" * 100 AS INTEGER)
      ELSE CAST("amount" * -100 AS INTEGER)
    END
  ),
  "description" = COALESCE("description", "rawDescription", 'Unknown transaction');

-- Enforce non-null constraints
ALTER TABLE "BankTransaction" ALTER COLUMN "amountMinor" SET NOT NULL;
ALTER TABLE "BankTransaction" ALTER COLUMN "description" SET NOT NULL;

-- Recreate the composite unique with explicit name if needed
DROP INDEX IF EXISTS "BankTransaction_userId_externalId_key";
CREATE UNIQUE INDEX "BankTransaction_userId_externalId" ON "BankTransaction"("userId", "externalId");
