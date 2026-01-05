Status: Active
Last updated: 2026-01-03

# DecisionEvent Ledger (authority replay log)

Purpose: Immutable audit trail of every authority_v1 evaluation. Drives replay, analytics, and learning; never mutates engine state.

## Current behavior (enforced / in code)
- `DecisionEvent` rows are written by `simulateSpendAuthority` when `ok: true`.
- The ledger is advisory-only and does not gate transactions or mutate buckets/ledger balances.

## Model
- Table: `DecisionEvent`
- Columns: `id`, `userId`, `surface`, `amountCents`, `category`, `verdict`, `reasonCode` (top), `reasonCodes` (array JSON), `severity`, `inputsVersion`, `counterfactuals` (JSON), `createdAt`.
- Write rule: `simulateSpendAuthority` writes exactly one row when authority returns `ok: true`; fallback/blocked results do not write; no dedup/retry; no updates.

## Why it matters
- Replay: reproduce “why was this warning shown?” using `inputsVersion` + reasons.
- Governance: measure rule fire rates, severity distribution, and surface-specific pressure.
- Learning: training substrate without touching money (advisory-only).
- Defensibility: clear lineage between inputs, verdicts, and user-facing guidance.

## Invariants
- Advisory-only: never used for authorization or spend control.
- Immutable: rows are append-only; no edits or deletes by authority code paths.
- Deterministic linkage: `inputsVersion` ties ledger entries to exact input snapshots; engine/version changes require bumps.
- Event identity: each call to `simulateSpendAuthority` that returns `ok: true` produces exactly one DecisionEvent. Identical inputs may produce multiple events if evaluated multiple times; the ledger does not deduplicate by content.
- Ordering: `createdAt` reflects wall-clock time at write. Ordering is best-effort and used for analysis only; replay correctness depends on `inputsVersion` and stored fields, not event order.

## Anti-patterns (forbidden)
- Using DecisionEvent to gate transactions or modify balances.
- Aggregating DecisionEvent with session/ledger mutations in the same transaction.
- Writing synthetic events from UI or client code.

## TODO — Phase 2: Ledger Safety & Replay Integrity

Status: Not started  
Prerequisite: Authority Phase 1 hardened in production-like usage

Goals:
- Prove DecisionEvent ledger is append-only and immutable.
- Guarantee exactly-once writes per authority evaluation.
- Ensure deterministic replay equivalence for all stored events.
- Enforce strict separation between ledger writes and engine state mutations.

Planned work:
- [ ] Add immutability guards (no update/delete paths; schema + code-level tests)
- [ ] Add exactly-once semantics tests (no duplicates, no drops)
- [ ] Add replay equivalence tests using replayAuthority (verdict, severity, reasons, inputsVersion)
- [ ] Add failure-isolation tests (ledger failures must not affect authority output)
- [ ] Add invariant tests preventing downstream reinterpretation of stored events

Explicitly out of scope:
- Analytics
- Aggregation
- UI
- Learning
- Any spend control or enforcement

## Future/Target behavior (explicitly speculative)
- Stronger immutability tests and replay integrity tooling for offline analysis.

## Related docs
- `docs/authority-v1.md`
- `docs/legal-constraints.md`
- `docs/api.md`
