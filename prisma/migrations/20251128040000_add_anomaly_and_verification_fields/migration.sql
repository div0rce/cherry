-- CreateEnum
CREATE TYPE "SessionAnomalyCode" AS ENUM ('NONE', 'AMOUNT_MISMATCH', 'TIME_WINDOW_VIOLATION', 'CARD_MISMATCH', 'MULTIPLE_CLAIMS', 'VERIFICATION_CONFLICT', 'ENGINE_INCONSISTENCY');

-- CreateEnum
CREATE TYPE "LedgerAnomalyCode" AS ENUM ('NONE', 'SESSION_ANOMALOUS', 'BALANCE_MISMATCH', 'DUPLICATE_POSTING');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED', 'EXPIRED_UNVERIFIED');

-- DropIndex
DROP INDEX "RecommendationSession_orderToken_key";

-- AlterTable
ALTER TABLE "CherryPointLedger" ADD COLUMN     "anomalyCode" "LedgerAnomalyCode" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "isAnomalous" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CherryPointLedger" ADD CONSTRAINT "points_nonnegative" CHECK ("points" >= 0);

-- AlterTable
ALTER TABLE "RecommendationSession" ADD COLUMN     "anomalyCode" "SessionAnomalyCode" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "anomalyDetails" TEXT,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "RecommendationSession" ADD CONSTRAINT "amount_cents_nonnegative" CHECK ("amountCents" >= 0);

-- CreateIndex
CREATE UNIQUE INDEX "user_order_token_unique" ON "RecommendationSession"("userId", "orderToken");
