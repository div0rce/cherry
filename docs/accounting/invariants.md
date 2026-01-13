Status: Active
Last updated: 2026-01-17

# Accounting Invariants

## Current behavior
- The accounting ledger contract lives in `lib/accounting/ledger.ts` and is pure, deterministic, and USD-only.
- Ledger operations are append-only; corrections are new transactions, never mutations.
- The model is advisory and internal. It does not touch payment rails and is separate from `CherryPointLedger`.
- Engine decisions must consume a validated snapshot; invalid ledger states are rejected by invariant checks.

## Canonical model

### Entities
- Account: a bucket with a currency and overdraft policy.
- Posting: an atomic signed amount applied to exactly one account.
- Transaction: an ordered set of postings (length >= 2).
- Ledger: the set of transactions plus derived balances.
- External event id: idempotency key for dedup.

### Sign convention
- Debit is positive, credit is negative.
- Assets and expenses increase with positive amounts.
- Income, liabilities, and equity increase with negative amounts.

### Base accounts (USD only)
- `ASSET:CASH` (no overdraft)
- `ASSET:RESERVED` (no overdraft)
- `EXPENSE:<category>`
- `INCOME:<source>`
- `LIABILITY:CREDIT_CARD`
- `EQUITY:OPENING`

### Transaction templates
- `SPEND`: `EXPENSE` (+) and `ASSET:CASH` or `LIABILITY:CREDIT_CARD` (-)
- `INCOME`: `ASSET:CASH` (+) and `INCOME` (-)
- `TRANSFER`: `ASSET` (+) and `ASSET` (-)
- `REFUND`: `ASSET:CASH` (+) and `EXPENSE` (-)
- `ADJUSTMENT`: target account (+/-) and `EQUITY:OPENING` (-/+)

## Invariants (I1-I8)

### I1 — Conservation (double-entry)
For every transaction, postings sum to zero in the ledger currency.

### I2 — Determinism
Given the same ordered events and `nowMs`, the final ledger state is identical.

### I3 — Idempotency
Reprocessing the same external event id does not change ledger state.

### I4 — Non-negative constraints
Accounts flagged `noOverdraft` must never have negative balances. If spend exceeds cash,
the transaction must use a liability posting (explicit debt).

### I5 — Classification soundness
Each posting must obey `(account_type, sign)` rules, with reversals allowed only for
`REFUND`, `REVERSAL`, or `ADJUSTMENT` transactions.

### I6 — Replay correctness
`replay(events) == materialized` for the same ordered event stream.

### I7 — Single-currency ledger
All postings must share the ledger currency (USD). Cross-currency requires an explicit FX transaction.

### I8 — Time correctness
Balance as of time `T` equals the sum of postings with `effectiveAtMs <= T`.

## Operations and preservation arguments (Ops)

### 1) Ingest statement line -> normalized external event
- Preconditions: external event id present; normalized to a deterministic ledger event.
- Preservation: does not mutate ledger; idempotency ensures replays do not append duplicates (I2, I3).

### 2) Create transaction (apply postings)
- Preconditions: postings are balanced, non-zero, and single-currency.
- Preservation: balance constructor enforces I1/I7; sign rules enforce I5; no-overdraft checks enforce I4.

### 3) Reverse transaction
- Preconditions: original txn exists; reversal postings negate the original.
- Preservation: negation keeps sum zero (I1) and marks explicit reversal type (I5).

### 4) Adjust / correction
- Preconditions: correction uses `ADJUSTMENT` and balances against equity.
- Preservation: append-only correction preserves I1/I6 and makes adjustments auditable.

### 5) Dedup merge
- Preconditions: external ids are merged to a canonical id.
- Preservation: dedup map blocks double-apply (I3) without mutating prior txns.

### 6) Recompute derived views
- Preconditions: derived views are recomputed from postings only.
- Preservation: replay and materialized match (I6); no new postings are introduced.

### 7) Engine decision (recommendation)
- Preconditions: decisions read a validated snapshot and declare any overdraft via liability postings.
- Preservation: decisions never invent money and must pass I1-I5 before execution.

## Enforcement and proofs (Current)
- Structural: `balancePostings` and branded types (`Currency`, `AccountId`, `TxnId`, `NonZeroAmount`).
- Procedural: deterministic, append-only event application in `lib/accounting/ledger.ts`.
- Tests: property-based invariants and replay checks in `tests/accounting/*.spec.ts`.
- Guardrails: `check:accounting-invariants`, `check:replay-equals-materialized`, `check:no-mutation`.

## Future behavior
- DB-backed accounting tables with append-only rows and correction tables.
- Event sourcing and replay integrated with sessions and ledger confirmation flows.
- Optional FX transactions with explicit rate snapshots when multi-currency is enabled.

## Related docs
- `docs/guardrails.md`
- `docs/legal-constraints.md`
- `docs/system-overview.md`
- `docs/decision-event-ledger.md`
- `docs/verification-flow.md`
