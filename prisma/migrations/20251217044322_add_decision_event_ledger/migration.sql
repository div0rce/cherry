-- CreateTable
CREATE TABLE "DecisionEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "inputsVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DecisionEvent_userId_createdAt_idx" ON "DecisionEvent"("userId", "createdAt");
