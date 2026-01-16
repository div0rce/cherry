Status: Draft
Last updated: 2026-02-14

# Engine ↔ Ledger Boundary

## Current

### Boundary definition

- Engine output ends at `EngineDecisionWithAccounting[]`.
- Accounting enforcement begins when proposed transactions are applied to the ledger state.
- The engine is treated as an upstream oracle by contract (frozen policy), not by internal inspection.

### Engine guarantees (assumed, not re-proven)

- Deterministic, ranked decisions.
- Output shape: `EngineDecisionWithAccounting[]`.
- Each decision carries proposed transactions plus proof results.
- Unsafe decisions are filtered before exposure.

### Ledger responsibilities

| Axiom | Ledger responsibility | Enforcement artifacts |
| --- | --- | --- |
| A1 — Conservation of value | Balanced transactions and zero-sum postings | `property.spec.ts`, `accounting-ledger-constraints.test.ts`, accounting migration constraints |
| A2 — No fund creation or destruction | Net-zero value movement only | `property.spec.ts`, `ledger-conservation.test.ts` |
| A3 — Double-entry completeness | Two+ postings, balanced by construction | `property.spec.ts`, `accounting-ledger-constraints.test.ts` |
| A4 — Ledger immutability | Append-only history and DB immutability | `no-mutation.spec.ts`, `accounting-immutability.test.ts` |
| A5 — Deterministic replay | Replay matches materialized results | `replay-equals-materialized.spec.ts`, `property.spec.ts` |
| A6 — Idempotency | Duplicate inputs do not double-apply | `property.spec.ts`, `idempotency-no-double-apply.test.ts` |
| A7 — Atomicity | No partial writes on failure | `atomicity-no-partial-writes.test.ts` |
| A8 — Monotonic ordering / time correctness | As-of balance respects effective time | `property.spec.ts`, `time-monotonicity.test.ts`, `engine-accounting-time-order.test.ts` |
| A9 — Materialized == replayed | Event replay matches persisted balances | `replay-equals-materialized.spec.ts`, `accounting-replay.test.ts` |

Guardrail enforcement ties these artifacts into CI: `check:accounting-invariants`,
`check:replay-equals-materialized`, `check:no-mutation`, and `check:db-accounting-replay`.

### Preservation argument (informal)

Given valid engine output plus a valid pre-ledger state, applying the proposed
transactions via the ledger entrypoints preserves each axiom:

- A1/A3: Each proposed transaction is balanced before application; applying zero-sum postings
  preserves conservation and double-entry.
- A2: Net-zero movement ensures no creation or destruction of value; balances change only by
  transfers between accounts.
- A4: Ledger application appends transactions without mutating history, preserving immutability.
- A5/A9: Replay applies the same ordered events as materialization, yielding identical balances.
- A6: External id mapping prevents duplicate application of the same event.
- A7: Application happens as a single atomic operation in persistence paths; failures roll back.
- A8: Effective times are nondecreasing and balance queries respect `effectiveAtMs`, so as-of
  balances remain monotonic with respect to time ordering.

### Explicit non-goals

- Engine optimality or ranking correctness.
- Business policy correctness or user intent correctness.
- Any behavior outside accounting invariants.

## Future

- None (boundary is fixed by contract).

## Related docs

- `docs/accounting-axioms.md`
- `docs/accounting-proof-inventory.md`
- `docs/accounting/invariants.md`
