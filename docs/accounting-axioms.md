Status: Draft
Last updated: 2026-01-16

# Accounting Axioms

## Current

### A1 — Conservation of value
All transactions must be balanced: the sum of postings in a transaction is zero.

### A2 — No fund creation or destruction
Ledger state changes may only move value between accounts; net creation is forbidden.

### A3 — Double-entry completeness
Every transaction has at least two postings and is balanced across accounts.

### A4 — Ledger immutability (append-only)
Posted ledger state is append-only; history is never mutated in place.

### A5 — Deterministic replay
Given the same ordered inputs and time parameters, replayed state is identical.

### A6 — Idempotency under duplicate inputs
Reprocessing the same external event does not change ledger state.

### A7 — Atomicity (no partial application)
Ledger operations are applied atomically; partial writes are forbidden.

### A8 — Monotonic ordering / time correctness
As-of balances respect posting effective time ordering.

### A9 — Materialized state equals replayed state
Replaying events yields the same balances as the materialized ledger.

## Axiom Coverage Map

| Axiom | Existing Artifacts | Coverage |
| --- | --- | --- |
| A1 — Conservation of value | `lib/accounting/ledger.ts`; `tests/accounting/property.spec.ts`; `tests/db/constraints/accounting-ledger-constraints.test.ts`; `prisma/migrations/20260117120000_accounting_ledger/migration.sql` | FULL |
| A2 — No fund creation or destruction | `lib/accounting/ledger.ts`; `tests/accounting/property.spec.ts`; `tests/db/constraints/accounting-ledger-constraints.test.ts` | FULL |
| A3 — Double-entry completeness | `lib/accounting/ledger.ts`; `tests/accounting/property.spec.ts` | FULL |
| A4 — Ledger immutability | `tests/accounting/no-mutation.spec.ts`; `tests/accounting/property.spec.ts`; `tests/db/semantics/accounting-immutability.test.ts` | FULL |
| A5 — Deterministic replay | `tests/accounting/property.spec.ts`; `tests/accounting/replay-equals-materialized.spec.ts` | FULL |
| A6 — Idempotency | `lib/accounting/ledger.ts`; `tests/accounting/property.spec.ts`; `tests/db/semantics/idempotency-no-double-apply.test.ts` | FULL |
| A7 — Atomicity | `tests/db/semantics/atomicity-no-partial-writes.test.ts` | FULL |
| A8 — Monotonic ordering / time correctness | `tests/accounting/property.spec.ts`; `tests/db/semantics/time-monotonicity.test.ts`; `tests/engine-accounting-time-order.test.ts` | FULL |
| A9 — Materialized == replayed | `tests/accounting/replay-equals-materialized.spec.ts`; `tests/accounting/property.spec.ts`; `tests/db/semantics/accounting-replay.test.ts` | FULL |

## Closure

Phase 1–3 complete; system closed under current axioms.

## Related docs

- `docs/accounting-proof-inventory.md`
- `docs/accounting/invariants.md`
