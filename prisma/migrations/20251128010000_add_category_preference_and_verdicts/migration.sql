-- CreateEnum
CREATE TYPE "CategoryBudgetMode" AS ENUM ('BUDGETED', 'UNBUDGETED');

-- CreateEnum
CREATE TYPE "BudgetVerdict" AS ENUM ('HEALTHY', 'BORDERLINE', 'BREAKS_BUDGET', 'UNCONFIGURED', 'UNBOUNDED');

-- CreateEnum
CREATE TYPE "CardVerdict" AS ENUM ('OPTIMAL', 'SUBOPTIMAL', 'NO_CARD_DATA');

-- CreateEnum
CREATE TYPE "OverallVerdict" AS ENUM ('GREEN', 'YELLOW', 'RED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CategoryCoverageModeDb" AS ENUM ('BUDGETED', 'UNBUDGETED', 'UNCONFIGURED');

-- AlterTable
ALTER TABLE "RecommendationSession" ADD COLUMN     "budgetVerdict" "BudgetVerdict" NOT NULL,
ADD COLUMN     "cardVerdict" "CardVerdict" NOT NULL,
ADD COLUMN     "coverageMode" "CategoryCoverageModeDb" NOT NULL,
ADD COLUMN     "overallVerdict" "OverallVerdict" NOT NULL;

-- CreateTable
CREATE TABLE "CategoryPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mode" "CategoryBudgetMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryPreference_userId_category_key" ON "CategoryPreference"("userId", "category");

-- AddForeignKey
ALTER TABLE "CategoryPreference" ADD CONSTRAINT "CategoryPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

