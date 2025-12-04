-- CreateTable
CREATE TABLE "HistoricalEngineEvaluation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "decisionType" TEXT NOT NULL,
    "cardId" TEXT,
    "bucketId" TEXT,
    "rawDecision" JSONB NOT NULL,
    "scores" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricalEngineEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoricalEngineEvaluation_userId_bankTransactionId_idx" ON "HistoricalEngineEvaluation"("userId", "bankTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalEngineEvaluation_runId_bankTransactionId_key" ON "HistoricalEngineEvaluation"("runId", "bankTransactionId");

-- AddForeignKey
ALTER TABLE "HistoricalEngineEvaluation" ADD CONSTRAINT "HistoricalEngineEvaluation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalEngineEvaluation" ADD CONSTRAINT "HistoricalEngineEvaluation_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
