-- AlterTable
ALTER TABLE "RecommendationSession" ADD COLUMN     "bucketSpendReversed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confirmedAmountCents" INTEGER;
