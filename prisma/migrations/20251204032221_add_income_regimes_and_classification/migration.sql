-- CreateEnum
CREATE TYPE "BankTransactionIncomeKind" AS ENUM ('NONE', 'PAYROLL', 'ALLOWANCE', 'SIDE_GIG', 'REFUND', 'INTERNAL_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "BankTransactionP2PKind" AS ENUM ('NONE', 'P2P_ALLOWANCE', 'P2P_REPAYMENT_IN', 'P2P_REPAYMENT_OUT', 'P2P_PSEUDO_MERCHANT_IN', 'P2P_PSEUDO_MERCHANT_OUT');

-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN     "incomeKind" "BankTransactionIncomeKind" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "p2pKind" "BankTransactionP2PKind" NOT NULL DEFAULT 'NONE',
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "postedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "HistoricalEngineEvaluation" ADD COLUMN     "bucketKey" TEXT,
ADD COLUMN     "bucketUsageAfterBps" INTEGER,
ADD COLUMN     "bucketUsageBeforeBps" INTEGER,
ADD COLUMN     "regimeId" TEXT;

-- CreateTable
CREATE TABLE "HistoricalIncomeRegime" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startMonth" TIMESTAMP(3) NOT NULL,
    "endMonth" TIMESTAMP(3) NOT NULL,
    "avgNetIncomeCents" INTEGER NOT NULL DEFAULT 0,
    "avgFixedCostsCents" INTEGER NOT NULL DEFAULT 0,
    "avgFreeCashCents" INTEGER NOT NULL DEFAULT 0,
    "regimeLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoricalIncomeRegime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalBucketTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "regimeId" TEXT NOT NULL,
    "bucketKey" TEXT NOT NULL,
    "monthlyLimitCents" INTEGER NOT NULL,
    "avgSpendCents" INTEGER NOT NULL DEFAULT 0,
    "targetShareBps" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoricalBucketTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoricalIncomeRegime_userId_startMonth_idx" ON "HistoricalIncomeRegime"("userId", "startMonth");

-- CreateIndex
CREATE INDEX "HistoricalBucketTemplate_userId_regimeId_idx" ON "HistoricalBucketTemplate"("userId", "regimeId");

-- AddForeignKey
ALTER TABLE "HistoricalEngineEvaluation" ADD CONSTRAINT "HistoricalEngineEvaluation_regimeId_fkey" FOREIGN KEY ("regimeId") REFERENCES "HistoricalIncomeRegime"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalIncomeRegime" ADD CONSTRAINT "HistoricalIncomeRegime_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalBucketTemplate" ADD CONSTRAINT "HistoricalBucketTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalBucketTemplate" ADD CONSTRAINT "HistoricalBucketTemplate_regimeId_fkey" FOREIGN KEY ("regimeId") REFERENCES "HistoricalIncomeRegime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
