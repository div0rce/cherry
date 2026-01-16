Status: Draft
Last updated: 2026-02-14

# Accounting Proof Inventory

## Current

Artifact: docs/accounting/invariants.md
Location: docs/accounting/invariants.md
Implicitly proves: Catalog of ledger invariants and operations (informal proof framing)
Notes: Defines I1-I9 and operation preservation narrative.
Maturity: EXPLICIT

Artifact: lib/accounting/ledger.ts
Location: lib/accounting/ledger.ts
Implicitly proves: Conservation of value; double-entry completeness; currency single-ledger enforcement; external id uniqueness; overdraft constraints for no-overdraft accounts
Notes: Enforces balanced postings, posting-role sign rules, and invariant validation helpers.
Maturity: IMPLICIT

Artifact: lib/accounting/engine-proof.ts
Location: lib/accounting/engine-proof.ts
Implicitly proves: Engine recommendations are filtered by ledger invariant validation before exposure
Notes: Builds hypothetical transactions, applies to ledger snapshot, and rejects invariant violations.
Maturity: IMPLICIT

Artifact: tests/accounting/property.spec.ts
Location: tests/accounting/property.spec.ts
Implicitly proves: Conservation of value; double-entry completeness; deterministic replay; idempotency; materialized == replayed; monotonic time balance queries; external id uniqueness; no mutation (append-only)
Notes: Property-based event stream over randomized seeds with replay and balance checks.
Maturity: IMPLICIT

Artifact: tests/accounting/no-mutation.spec.ts
Location: tests/accounting/no-mutation.spec.ts
Implicitly proves: Ledger immutability (append-only transaction history)
Notes: Ensures transaction history is monotonic and prior entries are unchanged.
Maturity: IMPLICIT

Artifact: tests/accounting/replay-equals-materialized.spec.ts
Location: tests/accounting/replay-equals-materialized.spec.ts
Implicitly proves: Deterministic replay; materialized == replayed state
Notes: Compares ledger state after applying events vs replay function.
Maturity: IMPLICIT

Artifact: tests/accounting/harness.ts
Location: tests/accounting/harness.ts
Implicitly proves: Deterministic event stream generator for accounting proofs
Notes: Provides seeded event generation and snapshot helpers for property tests.
Maturity: PARTIAL

Artifact: tests/engine-accounting-proof.test.ts
Location: tests/engine-accounting-proof.test.ts
Implicitly proves: Engine output proposals must satisfy ledger invariants; unsafe decisions filtered
Notes: Exercises overdraft, unbalanced postings, sign abuse, and filtering logic.
Maturity: IMPLICIT

Artifact: tests/engine-accounting-time-order.test.ts
Location: tests/engine-accounting-time-order.test.ts
Implicitly proves: Engine-output application preserves monotonic time ordering for balances
Notes: Applies engine-generated hypothetical txns at ordered effective times and checks as-of balances.
Maturity: EXPLICIT

Artifact: Guardrail check:accounting-invariants
Location: package.json (script check:accounting-invariants); scripts/guardrails/registry.mts
Implicitly proves: Property-based accounting invariants must pass in CI
Notes: Runs tests/accounting/property.spec.ts as a guardrail.
Maturity: IMPLICIT

Artifact: Guardrail check:replay-equals-materialized
Location: package.json (script check:replay-equals-materialized); scripts/guardrails/registry.mts
Implicitly proves: Replay equals materialized guardrail enforcement
Notes: Runs tests/accounting/replay-equals-materialized.spec.ts as a guardrail.
Maturity: IMPLICIT

Artifact: Guardrail check:no-mutation
Location: package.json (script check:no-mutation); scripts/guardrails/registry.mts
Implicitly proves: Ledger immutability guardrail enforcement
Notes: Runs tests/accounting/no-mutation.spec.ts as a guardrail.
Maturity: IMPLICIT

Artifact: Guardrail check:db-accounting-replay
Location: package.json (script check:db-accounting-replay); scripts/guardrails/registry.mts
Implicitly proves: DB accounting replay test existence (guardrail presence)
Notes: Ensures tests/db/semantics/accounting-replay.test.ts is present.
Maturity: PARTIAL

Artifact: tests/db/semantics/accounting-immutability.test.ts
Location: tests/db/semantics/accounting-immutability.test.ts
Implicitly proves: Ledger immutability at DB layer for accounting transactions/postings
Notes: Attempts updates/deletes on accounting tables and expects constraint failures.
Maturity: IMPLICIT

Artifact: tests/db/semantics/accounting-replay.test.ts
Location: tests/db/semantics/accounting-replay.test.ts
Implicitly proves: Materialized DB balances == in-memory replayed ledger
Notes: Rebuilds ledger from DB rows and compares balances.
Maturity: IMPLICIT

Artifact: tests/db/constraints/accounting-ledger-constraints.test.ts
Location: tests/db/constraints/accounting-ledger-constraints.test.ts
Implicitly proves: Accounting table constraints (FK, unique, non-zero amount, currency match, balanced postings trigger)
Notes: Exercises AccountingTransaction/AccountingPosting constraints.
Maturity: IMPLICIT

Artifact: prisma/migrations/20260117120000_accounting_ledger/migration.sql
Location: prisma/migrations/20260117120000_accounting_ledger/migration.sql
Implicitly proves: DB-level immutability; balanced postings; currency match; external id uniqueness
Notes: Defines accounting tables, constraints, and triggers.
Maturity: IMPLICIT

Artifact: prisma/schema.prisma
Location: prisma/schema.prisma
Implicitly proves: AccountingTransaction/AccountingPosting model structure and uniqueness constraint
Notes: ORM surface for accounting tables and relations.
Maturity: PARTIAL

Artifact: tests/db/semantics/atomicity-no-partial-writes.test.ts
Location: tests/db/semantics/atomicity-no-partial-writes.test.ts
Implicitly proves: Atomicity (no partial writes on failure)
Notes: Confirms transaction rollback when ledger insert fails.
Maturity: IMPLICIT

Artifact: tests/db/semantics/idempotency-no-double-apply.test.ts
Location: tests/db/semantics/idempotency-no-double-apply.test.ts
Implicitly proves: Idempotency under duplicate inputs
Notes: Enforces uniqueness of idempotency key and autopilot commit rows.
Maturity: IMPLICIT

Artifact: tests/db/semantics/time-monotonicity.test.ts
Location: tests/db/semantics/time-monotonicity.test.ts
Implicitly proves: Monotonic ordering of posted/revoked/verified/rejected timestamps
Notes: Validates temporal check constraints for ledger and sessions.
Maturity: IMPLICIT

Artifact: tests/db/semantics/temporal-immutability.test.ts
Location: tests/db/semantics/temporal-immutability.test.ts
Implicitly proves: Ledger immutability after terminal status
Notes: Attempts mutation of posted/revoked ledger and verified sessions.
Maturity: IMPLICIT

Artifact: tests/db/semantics/ledger-conservation.test.ts
Location: tests/db/semantics/ledger-conservation.test.ts
Implicitly proves: No negative points; conservation of CherryPoint ledger totals
Notes: Aggregates points and checks non-negative constraint.
Maturity: IMPLICIT

Artifact: tests/db/semantics/ledger-cross-row-conservation.test.ts
Location: tests/db/semantics/ledger-cross-row-conservation.test.ts
Implicitly proves: Cross-row status constraints for ledger/session lifecycle
Notes: Verifies constraint coupling between ledger and session statuses.
Maturity: IMPLICIT

Artifact: tests/db/semantics/ledger-semantic-uniqueness.test.ts
Location: tests/db/semantics/ledger-semantic-uniqueness.test.ts
Implicitly proves: Ledger uniqueness per session
Notes: Attempts duplicate ledger insert for a session and expects unique violation.
Maturity: IMPLICIT

Artifact: tests/db/semantics/status-causality.test.ts
Location: tests/db/semantics/status-causality.test.ts
Implicitly proves: Status causality for ledger and session rows
Notes: Ensures required timestamps exist for terminal statuses.
Maturity: IMPLICIT

Artifact: tests/db/semantics/lifecycle-cascade-policy.test.ts
Location: tests/db/semantics/lifecycle-cascade-policy.test.ts
Implicitly proves: Cascade deletes preserve ledger/session integrity
Notes: Verifies user delete cascades to sessions, commits, and ledger rows.
Maturity: IMPLICIT

Artifact: tests/db/constraints/ledger-required-fields.test.ts
Location: tests/db/constraints/ledger-required-fields.test.ts
Implicitly proves: Ledger row required fields and NOT NULL constraints
Notes: Validates required columns for CherryPoint ledger entries.
Maturity: IMPLICIT

Artifact: tests/db/constraints/idempotency-uniqueness.test.ts
Location: tests/db/constraints/idempotency-uniqueness.test.ts
Implicitly proves: Uniqueness constraints on idempotency keys
Notes: Guards against duplicate idempotency writes.
Maturity: IMPLICIT

Artifact: tests/db/constraints/constraint-coverage.test.ts
Location: tests/db/constraints/constraint-coverage.test.ts
Implicitly proves: DB constraint coverage exists for expected tables
Notes: Ensures declared constraints are present.
Maturity: IMPLICIT

Artifact: tests/db/constraints/foreign-keys.test.ts
Location: tests/db/constraints/foreign-keys.test.ts
Implicitly proves: Foreign key relationships required for ledger/session integrity
Notes: Validates FK enforcement across core tables.
Maturity: IMPLICIT

Artifact: tests/db/constraints/user-uniqueness.test.ts
Location: tests/db/constraints/user-uniqueness.test.ts
Implicitly proves: User uniqueness constraints
Notes: Prerequisite integrity for ledger ownership.
Maturity: PARTIAL

## Future

- None (inventory only).

## Related docs

- docs/accounting/invariants.md
- docs/guardrails.md
