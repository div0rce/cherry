-- AlterEnum
ALTER TYPE "RecommendationSource" ADD VALUE IF NOT EXISTS 'AUTOPILOT';

-- AlterTable
ALTER TABLE "RecommendationSession" ADD COLUMN "engineDecisionId" TEXT;

-- CreateTable
CREATE TABLE "AutopilotCommit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutopilotCommit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutopilotCommit_userId_decisionId_key" ON "AutopilotCommit"("userId", "decisionId");
CREATE INDEX "AutopilotCommit_sessionId_idx" ON "AutopilotCommit"("sessionId");
CREATE INDEX "RecommendationSession_userId_engineDecisionId_idx" ON "RecommendationSession"("userId", "engineDecisionId");

-- AddForeignKey
ALTER TABLE "AutopilotCommit" ADD CONSTRAINT "AutopilotCommit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutopilotCommit" ADD CONSTRAINT "AutopilotCommit_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RecommendationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
