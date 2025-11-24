-- CreateEnum
CREATE TYPE "BucketPeriod" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "RewardCategory" AS ENUM ('DINING', 'GROCERIES', 'GAS', 'TRAVEL', 'AIR_TRAVEL', 'HOTEL', 'CAR_RENTAL', 'ONLINE_SHOPPING', 'ENTERTAINMENT', 'HEALTH', 'UTILITIES', 'GENERAL_MERCHANDISE', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "isCredit" BOOLEAN NOT NULL,
    "annualFee" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRule" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "category" "RewardCategory" NOT NULL,
    "multiplier" DOUBLE PRECISION,
    "cashbackPercent" DOUBLE PRECISION,
    "capAmount" INTEGER,
    "promoStart" TIMESTAMP(3),
    "promoEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bucket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period" "BucketPeriod" NOT NULL,
    "budgetAmount" INTEGER NOT NULL,
    "currentAmount" INTEGER NOT NULL,
    "strictMode" BOOLEAN NOT NULL DEFAULT true,
    "category" "RewardCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantCategory" (
    "id" TEXT NOT NULL,
    "mccCode" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "networkVisa" BOOLEAN NOT NULL DEFAULT false,
    "networkMastercard" BOOLEAN NOT NULL DEFAULT false,
    "networkTsys" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "MerchantCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MccToRewardCategory" (
    "id" TEXT NOT NULL,
    "mccCode" INTEGER NOT NULL,
    "category" "RewardCategory" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MccToRewardCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulatedTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "merchantName" TEXT,
    "mccCode" INTEGER,
    "resolvedCategory" "RewardCategory" NOT NULL,
    "rewardRuleCategory" "RewardCategory",
    "multiplier" DOUBLE PRECISION,
    "cashbackPercent" DOUBLE PRECISION,
    "rewardsEarnedPoints" INTEGER,
    "rewardsEarnedCents" INTEGER,
    "bucketBeforeCents" INTEGER,
    "bucketAfterCents" INTEGER,
    "chosenCardId" TEXT,
    "bucketId" TEXT,
    "status" "TransactionStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulatedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantCategory_mccCode_key" ON "MerchantCategory"("mccCode");

-- CreateIndex
CREATE INDEX "MccToRewardCategory_mccCode_idx" ON "MccToRewardCategory"("mccCode");

-- CreateIndex
CREATE UNIQUE INDEX "MccToRewardCategory_mccCode_isDefault_key" ON "MccToRewardCategory"("mccCode", "isDefault");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRule" ADD CONSTRAINT "RewardRule_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bucket" ADD CONSTRAINT "Bucket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MccToRewardCategory" ADD CONSTRAINT "MccToRewardCategory_mccCode_fkey" FOREIGN KEY ("mccCode") REFERENCES "MerchantCategory"("mccCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulatedTransaction" ADD CONSTRAINT "SimulatedTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulatedTransaction" ADD CONSTRAINT "SimulatedTransaction_chosenCardId_fkey" FOREIGN KEY ("chosenCardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulatedTransaction" ADD CONSTRAINT "SimulatedTransaction_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "Bucket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
