-- Persist raw scheduled paydown timing source rows for engine evaluation.

CREATE TYPE "ScheduledPaydownStatus" AS ENUM ('SCHEDULED', 'CANCELLED');
CREATE TYPE "ScheduledPaydownSource" AS ENUM ('USER_SCHEDULED', 'AUTOPAY');

CREATE TABLE "ScheduledPaydown" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "debtId" TEXT,
  "amountCents" INTEGER NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "status" "ScheduledPaydownStatus" NOT NULL DEFAULT 'SCHEDULED',
  "source" "ScheduledPaydownSource" NOT NULL DEFAULT 'USER_SCHEDULED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ScheduledPaydown_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduledPaydown_userId_effectiveAt_idx"
  ON "ScheduledPaydown"("userId", "effectiveAt");

CREATE INDEX "ScheduledPaydown_userId_status_idx"
  ON "ScheduledPaydown"("userId", "status");

CREATE INDEX "ScheduledPaydown_userId_debtId_idx"
  ON "ScheduledPaydown"("userId", "debtId");

ALTER TABLE "ScheduledPaydown"
  ADD CONSTRAINT "scheduled_paydown__user_id__fk"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
