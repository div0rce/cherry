-- Normalize ledger timestamps to satisfy status causality checks.
UPDATE "CherryPointLedger"
SET "postedAt" = "createdAt"
WHERE "status" = 'POSTED'
  AND "postedAt" IS NULL;

UPDATE "CherryPointLedger"
SET "revokedAt" = "createdAt"
WHERE "status" = 'REVOKED'
  AND "revokedAt" IS NULL;

UPDATE "CherryPointLedger"
SET "postedAt" = NULL,
    "revokedAt" = NULL
WHERE "status" = 'PENDING'
  AND ("postedAt" IS NOT NULL OR "revokedAt" IS NOT NULL);

UPDATE "RecommendationSession"
SET "verifiedAt" = "createdAt"
WHERE "status" = 'VERIFIED'
  AND "verifiedAt" IS NULL;

UPDATE "RecommendationSession"
SET "rejectedAt" = "createdAt"
WHERE "status" = 'REJECTED'
  AND "rejectedAt" IS NULL;

UPDATE "RecommendationSession"
SET "verifiedAt" = NULL,
    "rejectedAt" = NULL
WHERE "status" IN ('RECOMMENDED', 'CLAIMED', 'EXPIRED')
  AND ("verifiedAt" IS NOT NULL OR "rejectedAt" IS NOT NULL);

-- Deduplicate ledger rows before enforcing session uniqueness.
DELETE FROM "CherryPointLedger"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id",
           row_number() OVER (
             PARTITION BY "sessionId"
             ORDER BY
               CASE "status"
                 WHEN 'REVOKED' THEN 3
                 WHEN 'POSTED' THEN 2
                 WHEN 'PENDING' THEN 1
               END DESC,
               "createdAt" DESC
           ) AS rn
    FROM "CherryPointLedger"
    WHERE "sessionId" IS NOT NULL
  ) AS "dedupe"
  WHERE "dedupe"."rn" > 1
);

CREATE UNIQUE INDEX "cherry_point_ledger__session_id__unique"
ON "CherryPointLedger"("sessionId");

ALTER TABLE "CherryPointLedger"
ADD CONSTRAINT "cherry_point_ledger__status_posted_at_revoked_at__check"
CHECK (
  ("status" = 'PENDING' AND "postedAt" IS NULL AND "revokedAt" IS NULL)
  OR ("status" = 'POSTED' AND "postedAt" IS NOT NULL AND "revokedAt" IS NULL)
  OR ("status" = 'REVOKED' AND "revokedAt" IS NOT NULL AND "postedAt" IS NULL)
);

ALTER TABLE "RecommendationSession"
ADD CONSTRAINT "recommendation_session__status_verified_at_rejected_at__check"
CHECK (
  ("status" IN ('RECOMMENDED', 'CLAIMED', 'EXPIRED')
    AND "verifiedAt" IS NULL
    AND "rejectedAt" IS NULL)
  OR ("status" = 'VERIFIED'
    AND "verifiedAt" IS NOT NULL
    AND "rejectedAt" IS NULL)
  OR ("status" = 'REJECTED'
    AND "rejectedAt" IS NOT NULL
    AND "verifiedAt" IS NULL)
);

CREATE OR REPLACE FUNCTION "cherry_point_ledger__session_status__check_fn"()
RETURNS trigger AS $$
DECLARE
  session_status "RecommendationStatus";
BEGIN
  IF NEW."sessionId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "status" INTO session_status
  FROM "RecommendationSession"
  WHERE "id" = NEW."sessionId";

  IF session_status IS NULL THEN
    RAISE EXCEPTION 'Missing session for ledger row'
      USING ERRCODE = '23514', CONSTRAINT = 'cherry_point_ledger__session_status__check';
  END IF;

  IF (NEW."status" = 'PENDING' AND session_status <> 'CLAIMED')
     OR (NEW."status" = 'POSTED' AND session_status <> 'VERIFIED')
     OR (NEW."status" = 'REVOKED' AND session_status <> 'REJECTED') THEN
    RAISE EXCEPTION 'Ledger status does not align with session status'
      USING ERRCODE = '23514', CONSTRAINT = 'cherry_point_ledger__session_status__check';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "cherry_point_ledger__session_status__check"
AFTER INSERT OR UPDATE OF "status", "sessionId" ON "CherryPointLedger"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "cherry_point_ledger__session_status__check_fn"();

CREATE OR REPLACE FUNCTION "recommendation_session__ledger_status__check_fn"()
RETURNS trigger AS $$
DECLARE
  ledger_status "CherryPointLedgerStatus";
BEGIN
  SELECT "status" INTO ledger_status
  FROM "CherryPointLedger"
  WHERE "sessionId" = NEW."id";

  IF NEW."status" IN ('CLAIMED', 'VERIFIED', 'REJECTED') THEN
    IF ledger_status IS NULL THEN
      RAISE EXCEPTION 'Session status requires ledger row'
        USING ERRCODE = '23514', CONSTRAINT = 'recommendation_session__ledger_status__check';
    END IF;

    IF (NEW."status" = 'CLAIMED' AND ledger_status <> 'PENDING')
       OR (NEW."status" = 'VERIFIED' AND ledger_status <> 'POSTED')
       OR (NEW."status" = 'REJECTED' AND ledger_status <> 'REVOKED') THEN
      RAISE EXCEPTION 'Session status does not align with ledger status'
        USING ERRCODE = '23514', CONSTRAINT = 'recommendation_session__ledger_status__check';
    END IF;
  ELSE
    IF ledger_status IS NOT NULL THEN
      RAISE EXCEPTION 'Ledger row exists for non-claimed session'
        USING ERRCODE = '23514', CONSTRAINT = 'recommendation_session__ledger_status__check';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "recommendation_session__ledger_status__check"
AFTER INSERT OR UPDATE OF "status" ON "RecommendationSession"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "recommendation_session__ledger_status__check_fn"();

CREATE OR REPLACE FUNCTION "cherry_point_ledger__status_final__check_fn"()
RETURNS trigger AS $$
BEGIN
  IF OLD."status" IN ('POSTED', 'REVOKED') THEN
    RAISE EXCEPTION 'CherryPointLedger is immutable after final status'
      USING ERRCODE = '23514', CONSTRAINT = 'cherry_point_ledger__status_final__check';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "cherry_point_ledger__status_final__check"
BEFORE UPDATE ON "CherryPointLedger"
FOR EACH ROW
EXECUTE FUNCTION "cherry_point_ledger__status_final__check_fn"();

CREATE OR REPLACE FUNCTION "recommendation_session__status_final__check_fn"()
RETURNS trigger AS $$
BEGIN
  IF OLD."status" IN ('VERIFIED', 'REJECTED', 'EXPIRED') THEN
    RAISE EXCEPTION 'RecommendationSession is immutable after final status'
      USING ERRCODE = '23514', CONSTRAINT = 'recommendation_session__status_final__check';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "recommendation_session__status_final__check"
BEFORE UPDATE ON "RecommendationSession"
FOR EACH ROW
EXECUTE FUNCTION "recommendation_session__status_final__check_fn"();
