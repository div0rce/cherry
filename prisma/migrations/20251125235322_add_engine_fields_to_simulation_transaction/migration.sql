-- AlterTable
ALTER TABLE "SimulatedTransaction" ADD COLUMN     "bucketLimitCents" INTEGER,
ADD COLUMN     "bucketName" TEXT,
ADD COLUMN     "bucketPeriod" "BucketPeriod",
ADD COLUMN     "chosenCardName" TEXT,
ADD COLUMN     "rewardMultiplier" INTEGER,
ADD COLUMN     "rewardsEarned" INTEGER,
ADD COLUMN     "strictDecline" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "SimulatedTransaction_userId_idx" ON "SimulatedTransaction"("userId");
