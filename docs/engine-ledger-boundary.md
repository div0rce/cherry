Status: Draft
Last updated: 2026-01-16

# Engine ↔ Ledger Boundary

## Current

### 1. Purpose

- This document defines the accounting responsibility boundary.
- Engine correctness ≠ accounting correctness.
- Accounting starts at engine output.

### 2. Boundary definition

- Data that crosses the boundary: `EngineDecisionWithAccounting[]`.
- Data that does not cross the boundary: engine internals, heuristics, rankings.
- The engine is treated as an upstream oracle by contract, not by trust.

### 3. Engine guarantees (assumed, not re-proven)

- Deterministic output.
- Ranked decisions.
- Attached accounting proposals.
- Unsafe decisions already filtered.
- Frozen by `scripts/guardrails/engine-freeze.policy.json`.

### 4. Ledger responsibilities

- A1 — Conservation of value
  - Ledger validation (`lib/accounting/ledger.ts`).
  - DB constraints (`prisma/migrations/20260117120000_accounting_ledger/migration.sql`).
  - Property tests (`tests/accounting/property.spec.ts`).
- A2 — No fund creation or destruction
  - Ledger validation (`lib/accounting/ledger.ts`).
  - Property tests (`tests/accounting/property.spec.ts`).
  - DB constraints (`tests/db/constraints/accounting-ledger-constraints.test.ts`).
- A3 — Double-entry completeness
  - Ledger validation (`lib/accounting/ledger.ts`).
  - Property tests (`tests/accounting/property.spec.ts`).
- A4 — Ledger immutability
  - Guardrail enforcement (`check:no-mutation`).
  - DB semantics tests (`tests/db/semantics/accounting-immutability.test.ts`).
  - Property tests (`tests/accounting/property.spec.ts`).
- A5 — Deterministic replay
  - Replay test (`tests/accounting/replay-equals-materialized.spec.ts`).
  - Property tests (`tests/accounting/property.spec.ts`).
- A6 — Idempotency
  - Ledger validation (`lib/accounting/ledger.ts`).
  - Property tests (`tests/accounting/property.spec.ts`).
  - DB semantics tests (`tests/db/semantics/idempotency-no-double-apply.test.ts`).
- A7 — Atomicity
  - DB semantics tests (`tests/db/semantics/atomicity-no-partial-writes.test.ts`).
- A8 — Monotonic ordering / time correctness
  - Property tests (`tests/accounting/property.spec.ts`).
  - DB semantics tests (`tests/db/semantics/time-monotonicity.test.ts`).
  - Engine boundary test (`tests/engine-accounting-time-order.test.ts`).
- A9 — Materialized == replayed
  - Replay test (`tests/accounting/replay-equals-materialized.spec.ts`).
  - DB semantics tests (`tests/db/semantics/accounting-replay.test.ts`).

### 5. Preservation argument (informal, explicit)

- A1: Given valid engine output and a valid pre-ledger state, applying zero-sum postings preserves conservation because each transaction balances to zero.
- A2: Given valid engine output and a valid pre-ledger state, applying postings preserves value because only transfers between accounts are allowed.
- A3: Given valid engine output and a valid pre-ledger state, applying transactions preserves double-entry because each transaction has paired postings.
- A4: Given valid engine output and a valid pre-ledger state, application preserves immutability because ledger entrypoints append and DB triggers block mutation.
- A5: Given valid engine output and a valid pre-ledger state, replay determinism holds because the same ordered events produce the same balances.
- A6: Given valid engine output and a valid pre-ledger state, idempotency holds because external ids are mapped once and duplicates are rejected.
- A7: Given valid engine output and a valid pre-ledger state, atomicity holds because persistence writes occur in a single transaction or not at all.
- A8: Given valid engine output and a valid pre-ledger state, time monotonicity holds because effective times are nondecreasing and as-of queries respect ordering.
- A9: Given valid engine output and a valid pre-ledger state, materialized equals replayed because replay applies the same event sequence as persistence.

### 6. Explicit non-goals

- Engine optimality.
- Business policy correctness.
- User intent correctness.
- Recommendation quality.

### 7. Cross-references

- `docs/accounting-axioms.md`
- `docs/accounting-proof-inventory.md`
- Key tests: `property.spec.ts`, `replay-equals-materialized.spec.ts`, `accounting-replay.test.ts`, `engine-accounting-time-order.test.ts`.

## Future

- None (boundary is fixed by contract).

## Related docs

- `docs/accounting-axioms.md`
- `docs/accounting-proof-inventory.md`
- `docs/accounting/invariants.md`
