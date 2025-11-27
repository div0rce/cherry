-- CreateEnum
CREATE TYPE "CherryPointLedgerStatus" AS ENUM ('PENDING', 'POSTED', 'REVOKED');

-- CreateTable
CREATE TABLE "CherryPointLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" "CherryPointLedgerStatus" NOT NULL DEFAULT 'POSTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CherryPointLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CherryPointLedger_userId_idx" ON "CherryPointLedger"("userId");

-- CreateIndex
CREATE INDEX "CherryPointLedger_sessionId_idx" ON "CherryPointLedger"("sessionId");

-- AddForeignKey
ALTER TABLE "CherryPointLedger" ADD CONSTRAINT "CherryPointLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CherryPointLedger" ADD CONSTRAINT "CherryPointLedger_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RecommendationSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
