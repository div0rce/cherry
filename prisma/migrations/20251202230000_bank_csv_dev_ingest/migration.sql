-- AlterTable
ALTER TABLE "BankTransaction"
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'legacy',
ADD COLUMN     "accountLast4" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "rawDescription" TEXT,
ADD COLUMN     "amountMinor" INTEGER,
ADD COLUMN     "postedAt" TIMESTAMPTZ,
ADD COLUMN     "sourceStatement" TEXT,
ADD COLUMN     "statementStart" TEXT,
ADD COLUMN     "statementEnd" TEXT,
ADD COLUMN     "section" TEXT;

-- Backfill externalId from the existing primary key
UPDATE "BankTransaction" SET "externalId" = "id" WHERE "externalId" IS NULL;

-- Ensure externalId is required going forward
ALTER TABLE "BankTransaction" ALTER COLUMN "externalId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_userId_externalId_key" ON "BankTransaction"("userId", "externalId");
