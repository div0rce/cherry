-- guardrail: migration-no-replay-test-ok
-- justification: no replay impact; metadata-only change
ALTER TABLE "BankTransaction" ADD COLUMN "note" TEXT;
