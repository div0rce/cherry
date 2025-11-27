-- CreateEnum
CREATE TYPE "RecommendationVerdict" AS ENUM ('HEALTHY', 'BORDERLINE', 'BREAKS_BUDGET', 'DECLINED');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('RECOMMENDED', 'CONFIRMED', 'DISMISSED', 'EXPIRED');

-- CreateTable
CREATE TABLE "RecommendationSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchantName" TEXT,
    "mccCode" INTEGER,
    "category" "RewardCategory" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "deviceId" TEXT,
    "storeId" TEXT,
    "terminalId" TEXT,
    "orderId" TEXT,
    "orderToken" TEXT,
    "recommendedCardId" TEXT,
    "recommendedBucketId" TEXT,
    "verdict" "RecommendationVerdict" NOT NULL,
    "cherryPointsOffered" INTEGER NOT NULL DEFAULT 0,
    "status" "RecommendationStatus" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationSession_orderToken_key" ON "RecommendationSession"("orderToken");

-- CreateIndex
CREATE INDEX "RecommendationSession_userId_idx" ON "RecommendationSession"("userId");

-- CreateIndex
CREATE INDEX "RecommendationSession_recommendedCardId_idx" ON "RecommendationSession"("recommendedCardId");

-- CreateIndex
CREATE INDEX "RecommendationSession_recommendedBucketId_idx" ON "RecommendationSession"("recommendedBucketId");

-- AddForeignKey
ALTER TABLE "RecommendationSession" ADD CONSTRAINT "RecommendationSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationSession" ADD CONSTRAINT "RecommendationSession_recommendedCardId_fkey" FOREIGN KEY ("recommendedCardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationSession" ADD CONSTRAINT "RecommendationSession_recommendedBucketId_fkey" FOREIGN KEY ("recommendedBucketId") REFERENCES "Bucket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
