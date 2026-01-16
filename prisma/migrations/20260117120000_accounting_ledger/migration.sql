-- Accounting ledger tables and invariants.

CREATE TABLE "AccountingTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "txnType" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "externalId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountingTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingPosting" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "accountType" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountingPosting_pkey" PRIMARY KEY ("id")
);

-- A6: idempotency via external id uniqueness.
CREATE UNIQUE INDEX "accounting_transaction__user_id_external_id__unique"
  ON "AccountingTransaction"("userId", "externalId");

CREATE INDEX "AccountingTransaction_userId_idx" ON "AccountingTransaction"("userId");
CREATE INDEX "AccountingTransaction_effectiveAt_idx" ON "AccountingTransaction"("effectiveAt");

CREATE INDEX "AccountingPosting_transactionId_idx" ON "AccountingPosting"("transactionId");
CREATE INDEX "AccountingPosting_accountId_idx" ON "AccountingPosting"("accountId");

ALTER TABLE "AccountingTransaction"
  ADD CONSTRAINT "accounting_transaction__user_id__fk"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountingPosting"
  ADD CONSTRAINT "accounting_posting__transaction_id__fk"
  FOREIGN KEY ("transactionId") REFERENCES "AccountingTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountingPosting"
  ADD CONSTRAINT "accounting_posting__amount__check"
  CHECK ("amount" <> 0);

-- A4: accounting transactions are immutable (append-only).
CREATE OR REPLACE FUNCTION "accounting_transaction__immutable__check_fn"()
RETURNS trigger AS $$
DECLARE
  allow_mutation TEXT;
BEGIN
  SELECT current_setting('cherry.allow_accounting_mutation', true) INTO allow_mutation;
  IF allow_mutation = '1' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'AccountingTransaction rows are immutable'
    USING ERRCODE = '23514', CONSTRAINT = 'accounting_transaction__immutable__check';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "accounting_transaction__immutable__check"
BEFORE UPDATE OR DELETE ON "AccountingTransaction"
FOR EACH ROW EXECUTE FUNCTION "accounting_transaction__immutable__check_fn"();

-- A4: accounting postings are immutable (append-only).
CREATE OR REPLACE FUNCTION "accounting_posting__immutable__check_fn"()
RETURNS trigger AS $$
DECLARE
  allow_mutation TEXT;
BEGIN
  SELECT current_setting('cherry.allow_accounting_mutation', true) INTO allow_mutation;
  IF allow_mutation = '1' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'AccountingPosting rows are immutable'
    USING ERRCODE = '23514', CONSTRAINT = 'accounting_posting__immutable__check';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "accounting_posting__immutable__check"
BEFORE UPDATE OR DELETE ON "AccountingPosting"
FOR EACH ROW EXECUTE FUNCTION "accounting_posting__immutable__check_fn"();

-- A1/A3: postings must share transaction currency.
CREATE OR REPLACE FUNCTION "accounting_posting__currency__check_fn"()
RETURNS trigger AS $$
DECLARE
  txn_currency TEXT;
BEGIN
  SELECT "currency" INTO txn_currency FROM "AccountingTransaction" WHERE "id" = NEW."transactionId";
  IF txn_currency IS NULL THEN
    RAISE EXCEPTION 'Missing transaction for posting'
      USING ERRCODE = '23514', CONSTRAINT = 'accounting_posting__currency__check';
  END IF;
  IF NEW."currency" <> txn_currency THEN
    RAISE EXCEPTION 'Posting currency mismatch'
      USING ERRCODE = '23514', CONSTRAINT = 'accounting_posting__currency__check';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "accounting_posting__currency__check"
AFTER INSERT OR UPDATE OF "currency", "transactionId" ON "AccountingPosting"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "accounting_posting__currency__check_fn"();

-- A1/A3: postings per transaction must balance to zero.
CREATE OR REPLACE FUNCTION "accounting_posting__transaction_id__check_fn"()
RETURNS trigger AS $$
DECLARE
  target_id TEXT;
  total BIGINT;
BEGIN
  target_id := COALESCE(NEW."transactionId", OLD."transactionId");
  SELECT COALESCE(SUM("amount"), 0) INTO total FROM "AccountingPosting" WHERE "transactionId" = target_id;
  IF total <> 0 THEN
    RAISE EXCEPTION 'AccountingPosting entries must balance'
      USING ERRCODE = '23514', CONSTRAINT = 'accounting_posting__transaction_id__check';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "accounting_posting__transaction_id__check"
AFTER INSERT OR UPDATE OR DELETE ON "AccountingPosting"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "accounting_posting__transaction_id__check_fn"();
