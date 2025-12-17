Status: Active
Last updated: 2025-12-17

# DecisionEvent Ledger (authority replay log)

Purpose: Immutable audit trail of every authority_v1 evaluation. Drives replay, analytics, and learning; never mutates engine state.

## Model
- Table: `DecisionEvent`
- Columns: `id`, `userId`, `surface`, `verdict`, `reasonCode` (top), `reasonCodes` (array), `severity`, `inputsVersion`, `createdAt`.
- Write rule: every `simulateSpendAuthority` call writes exactly one row; no dedup/retry; no updates.

## Why it matters
- Replay: reproduce “why was this warning shown?” using `inputsVersion` + reasons.
- Governance: measure rule fire rates, severity distribution, and surface-specific pressure.
- Learning: training substrate without touching money (advisory-only).
- Defensibility: clear lineage between inputs, verdicts, and user-facing guidance.

## Invariants
- Advisory-only: never used for authorization or spend control.
- Immutable: rows are append-only; no edits or deletes by authority code paths.
- Deterministic linkage: `inputsVersion` ties ledger entries to exact input snapshots; engine/version changes require bumps.

## Anti-patterns (forbidden)
- Using DecisionEvent to gate transactions or modify balances.
- Aggregating DecisionEvent with session/ledger mutations in the same transaction.
- Writing synthetic events from UI or client code.
