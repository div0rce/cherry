Status: Draft
Last updated: 2025-12-02

# Bank ingest notes

Quick capture of how `BankTransaction` is read today and what an ingest pipeline must populate to keep history/statements working.

## What reads BankTransaction
- `lib/unified-activity.ts` pulls `prisma.bankTransaction` rows (optionally period-filtered) and maps:
  - `amount` (Decimal) → cents, signed by `direction` (`CREDIT` positive, otherwise negative).
  - `currency`, `occurredAt`, `merchantName`, `mcc`.
  - `cardBrand`, `cardLast4`.
  - `merchantCity/Region/Country` (or from linked `merchantObservation`) for location.
  - `statementPeriod` derived from `occurredAt`.
- `app/history/page.tsx` and `app/statements/page.tsx` consume the unified activity feed; real spend rows come from `BankTransaction`, while simulations/ledger rows are shown separately.

## Schema fields that matter (prisma/schema.prisma)
- `BankTransaction`:
  - Identity and scoping: `id` (cuid), `externalId` (idempotency key, unique per `userId`), `userId` (FK to User), `source` (e.g., `plaid`, `teller`, `dev_simulator`, `csv_dev`), `accountId` (string; provider account identifier), `accountLast4?`.
  - Merchant context: `merchantName`, `description/rawDescription`, `merchantCity`, `merchantRegion`, `merchantCountry`, `mcc`, `merchantObservationId?`.
  - Card-ish metadata: `cardBrand?`, `cardLast4?`.
  - Money fields: `amount` (Decimal, provider-native units), `amountMinor?` (integer cents, signed by direction), `currency` (string), `direction` (`CREDIT` treated as positive in unified feed), `transactionType?`, `section?`, `isRecurring?`.
  - Classification hints: `incomeKind` (PAYROLL/ALLOWANCE/SIDE_GIG/REFUND/INTERNAL_TRANSFER/OTHER/NONE) and `p2pKind` (P2P_ALLOWANCE/REPAYMENT/PSEUDO_MERCHANT/ NONE) are set by the dev-only classifier for offline evaluator regimes.
  - Timestamps: `occurredAt` (required), `postedAt?`, plus `createdAt`/`updatedAt` defaults.
  - Statement metadata: `sourceStatement?`, `statementStart?`, `statementEnd?`.
  - Raw payload: `raw` (Json?; should include source and raw lines when present).

## Where fake/simulated data comes from
- `SimulatedTransaction` (populated by `/api/simulate` and seeds) feeds the unified activity as `SIMULATED_TRANSACTION`.
- `CherryPointLedger` rows show as `POINTS_EVENT` with inferred cash deltas.
- No real bank ingest exists yet; `app/bank-simulator` exposes pending sessions and manual verify/reject for points, but does not create `BankTransaction` rows.
- Offline evaluator: `HistoricalEngineEvaluation` stores engine advice for historical `BankTransaction` rows (e.g., `csv_dev` SafeBalance ingest) and is populated by `lib/evaluator/offline-history.ts` via `npm run dev:evaluator:moustafa`. It is read-only and does not create sessions/ledger rows.

## Implications for ingest
- Ingest must upsert `BankTransaction` rows (idempotent by provider transaction id).
- `direction` and `amount` must be consistent: unified feed assumes `direction === 'CREDIT'` means positive cash delta; otherwise debit.
- Location/merchant info should populate `merchant*` fields and optionally link/create `MerchantObservation` for reuse across ledger/points.
- Do not touch buckets or ledgers during ingest; verification/points stay separate.

## Idempotency & internal IDs
- `BankTransaction.id` is internal only (`cuid`) and never set from provider/CSV data.
- Idempotency is enforced on `(userId, externalId)`:
- Schema: `@@unique([userId, externalId], name: "BankTransaction_userId_externalId")`
  - Code: all ingest paths use `where: { userId_externalId: { userId, externalId } }`.
- Ingest flows must normalize into `NormalizedBankTransactionInput` and call `upsertBankTransactions`; avoid direct `create`/`update` to prevent collisions.
- `externalId` must be stable per provider (e.g., provider transaction id or deterministic hash of date/amount/raw description for CSV).
- Dev ingest/evaluator identity: `BANK_INGEST_USER_EMAIL`/`BANK_INGEST_USER_ID` picks the ingest user; evaluator scripts and `/dev/evaluator` must use the same user to render results.

## Dev CSV provider guardrails (moustafa SafeBalance import)
- Dataset lives at `data/bank/moustafa-adv-safebalance-2061.csv`; parser in `lib/bank/csv-dev-provider.ts` keeps the source shape as-is (no business logic).
- Script `npm run dev:ingest:moustafa-bank` (uses lab or provided user) normalizes rows and upserts `BankTransaction` with `source = "csv_dev"` and unique `externalId` hash; reruns are idempotent.
- `upsertBankTransactions` explicitly skips `csv_dev` rows in production to keep the CSV provider dev-only.
- Unified activity treats `csv_dev` rows like other bank rows; merchant fallback uses `description` when merchant name is absent.
- After ingest, run the dev classifier + regime builder (via `npm run dev:evaluator:moustafa`) to populate `incomeKind`/`p2pKind`, `HistoricalIncomeRegime`, and `HistoricalBucketTemplate` for offline evaluator metrics. These writes stay in dev tables and do not touch live Buckets or Ledger rows.
