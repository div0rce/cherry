/*
  Warnings:

  - A unique constraint covering the columns `[userId,source,engineDecisionId]` on the table `RecommendationSession` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "RecommendationSession_userId_source_engineDecisionId_key" ON "RecommendationSession"("userId", "source", "engineDecisionId");
