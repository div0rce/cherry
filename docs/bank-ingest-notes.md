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
  - `userId` (FK to User) — required for scoping.
  - `accountId` (string) — provider account identifier (no FK today).
  - Merchant context: `merchantName`, `merchantCity`, `merchantRegion`, `merchantCountry`, `mcc`, `merchantObservationId?`.
  - Card-ish metadata: `cardBrand?`, `cardLast4?`.
  - Money fields: `amount` (Decimal, provider-native units), `currency` (string), `direction` (string, `CREDIT` treated as positive in unified feed), `transactionType?`, `isRecurring?`.
  - Timestamps: `occurredAt` (required), plus optional `createdAt`/`updatedAt` defaults.
  - Raw payload: `raw` (Json?).

## Where fake/simulated data comes from
- `SimulatedTransaction` (populated by `/api/simulate` and seeds) feeds the unified activity as `SIMULATED_TRANSACTION`.
- `CherryPointLedger` rows show as `POINTS_EVENT` with inferred cash deltas.
- No real bank ingest exists yet; `app/bank-simulator` exposes pending sessions and manual verify/reject for points, but does not create `BankTransaction` rows.

## Implications for ingest
- Ingest must upsert `BankTransaction` rows (idempotent by provider transaction id).
- `direction` and `amount` must be consistent: unified feed assumes `direction === 'CREDIT'` means positive cash delta; otherwise debit.
- Location/merchant info should populate `merchant*` fields and optionally link/create `MerchantObservation` for reuse across ledger/points.
- Do not touch buckets or ledgers during ingest; verification/points stay separate.
