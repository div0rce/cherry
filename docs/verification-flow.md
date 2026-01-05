Status: Draft
Last updated: 2026-01-02

# Verification flow

This document describes how sessions and ledger rows are verified today and where future automation should land.

## Current behavior (enforced / in code)

## Source of truth
- Sessions are created via `/api/sessions` or `/api/vine/order` and write `RecommendationSession` + `CherryPointLedger` (PENDING).
- Bank ingest populates `BankTransaction` rows (see `docs/bank-ingest-notes.md`) but does not mutate ledger/buckets directly.
- Verification advances sessions/ledger using `lib/verification/verify-session.ts`.

## Verification inputs
- `VerificationSignal` (`lib/verification/types.ts`):
  - `sessionId`, `userId` (required)
  - Optional: `amountCents`, `occurredAt`, `merchantFingerprint`, `verified` override
  - `source`: `"BANK" | "VINE" | "MANUAL"`

## Matching rules (verifySessionFromSignal)
- Loads session by `sessionId`/`userId`; finalized sessions short-circuit.
- Infers match when all true:
  - Amount within `max(100¢, 5%)` of `confirmedAmountCents ?? amountCents`.
  - Timestamp within 24h of session `createdAt`.
  - Merchant fingerprints equal when both provided.
- `verified` flag in the signal overrides the inference.

## Outcomes
- Match/verified: `RecommendationSession.status = VERIFIED`, `verificationStatus = VERIFIED`, ledger `PENDING → POSTED`, timestamps set, anomalies preserved.
- Mismatch/unverified: `status = REJECTED`, `verificationStatus = FAILED`, ledger `PENDING → REVOKED`, anomaly becomes `VERIFICATION_CONFLICT` when previously `NONE`.
- Bucket reversal: if unverified and bucket spend not yet reversed, `computeBucketReversal` rolls back `spentCents` (after `ensureBucketFresh`).

## Entry points
- Manual API: `/api/sessions/[id]/verify` now delegates to `verifySessionFromSignal` using the request body `{ verified: boolean }`.
- Dev trigger: `/api/dev/verification/trigger` accepts `sessionId`, optional `amountCents`, `merchantFingerprint`, `verified`.
- Bank ingest: currently does not auto-trigger verification; hook by queuing signals and calling `verifySessionFromSignal` in a worker/cron.

## Future/Target behavior (explicitly speculative)
- Automated signal ingestion from bank/receipt/Vine sources with background verification workers.
- Stronger merchant fingerprinting and receipt matching before posting ledger rows.

## Related docs
- `docs/bank-ingest-notes.md`
- `docs/legal-constraints.md`
- `docs/api.md`
