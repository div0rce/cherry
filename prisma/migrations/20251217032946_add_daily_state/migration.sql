-- CreateEnum
CREATE TYPE "DailyStateStatus" AS ENUM ('SAFE', 'TIGHT', 'RISKY', 'INSUFFICIENT_DATA');

-- CreateEnum
CREATE TYPE "DailyStateSource" AS ENUM ('NIGHTLY', 'MANUAL');

-- CreateTable
CREATE TABLE "DailyState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "DailyStateStatus" NOT NULL,
    "safeToSpendCents" INTEGER,
    "nextRiskEvent" JSONB,
    "summary" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "DailyStateSource" NOT NULL DEFAULT 'NIGHTLY',
    "engineVersion" TEXT,
    "inputsVersion" TEXT,
    "errors" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyState_userId_computedAt_idx" ON "DailyState"("userId", "computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyState_userId_date_key" ON "DailyState"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyState" ADD CONSTRAINT "DailyState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
