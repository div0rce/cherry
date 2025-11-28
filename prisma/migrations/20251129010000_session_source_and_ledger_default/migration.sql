-- CreateEnum
CREATE TYPE "RecommendationSource" AS ENUM ('APP_SCAN', 'VINE_SIM', 'VINE_DEVICE');

-- AlterTable
ALTER TABLE "RecommendationSession" ADD COLUMN     "source" "RecommendationSource" NOT NULL DEFAULT 'APP_SCAN';
ALTER TABLE "RecommendationSession" ALTER COLUMN "orderToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationSession_orderToken_key" ON "RecommendationSession"("orderToken");

-- AlterTable
ALTER TABLE "CherryPointLedger" ALTER COLUMN "status" SET DEFAULT 'PENDING';
