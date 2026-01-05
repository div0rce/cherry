Status: Active
Last updated: 2026-01-03

# Dev UI Parity

Cherry policy: no important backend behavior is allowed to exist without a Dev Console surface.
Invariant: Dev UI surfaces may read, simulate, replay, and diagnose backend behavior. They must not mutate user-facing financial state except through explicit admin tools.

### Backend behavior classification

For parity purposes, backend behavior falls into three classes:

1. **Inspectable (required Dev UI)**
   Deterministic, decision-making, or stateful systems whose correctness affects user outcomes (e.g., engine decisions, guardrails, ingest, authority).

2. **Operational (no Dev UI required)**
   Infrastructure-only concerns with no decision semantics (e.g., logging, metrics export, auth plumbing).

3. **Transitional**
   Temporary shims or legacy paths scheduled for removal; must either gain a Dev UI or be deleted within one release cycle.

This table tracks only Inspectable systems.

## Current behavior

| Backend feature ID | Description | Code location | Effect | Dev UI surface | Status |
|--------------------|-------------|---------------|--------|----------------|--------|
| ENGINE_DECISION_CORE | Core decision solver and ranking of EngineDecision[] | lib/engine/solver.ts | Determines which card/action Cherry recommends | /dev/engine/inspector | implemented |
| GUARDRAILS_CORE | Hard + soft guardrails for unsafe spend, delays, and runway breaches | lib/engine/guardrails.ts | Blocks unsafe actions before scoring + tags soft warnings | /dev/engine/guardrails | implemented |
| SESSIONS_LIFECYCLE | Recommendation sessions create/confirm/verify | app/api/sessions/* | Persists advisory sessions and point offers | /sessions | implemented |
| BANK_INGEST_PIPELINE | Bank ingest upsert pipeline and CSV dev ingest | lib/bank/ingest.ts | Normalizes external bank events into BankTransaction | /dev/ingest, /dev/bank, /bank-simulator | implemented |
| VINE_CONTEXT_PIPELINE | Vine BLE/NFC ingest + run recommendation shim | lib/vine/run-recommendation.ts | Translates Vine device payloads into recommendation sessions | /vine-simulator | implemented |
| BUCKET_RUNTIME_GUARDRAILS | Bucket runtime math and guardrails | lib/buckets-runtime.ts | Computes remaining/committed spend for guardrails | /dev/buckets | implemented |
| OFFLINE_EVALUATOR | Offline evaluator against historical spend | lib/evaluator/offline-history.ts | Scores historical spend snapshots for diagnostics | /dev/evaluator | implemented |
| INVARIANTS_AND_ASSUMPTIONS | Engine invariants + guardrail enforcement checks | lib/engine-invariants.ts, `check:guardrails-core` | Validates solver + session guardrails before deploy | /admin (Invariants panel) | implemented |

Script hook: `check:dev-ui-parity` logs the current implemented vs missing counts (non-blocking for now).
Blocking criteria (future):
- A new Inspectable backend feature without a declared Dev UI surface.
- Removal of a Dev UI surface while its backend feature remains active.
Note: `/sessions` is a dev-only surface despite not living under `/dev/*`; it is gated and treated as part of the Dev Console.

## Future/Target behavior

- TODO: Add parity coverage for new backend subsystems as they ship.

## Related docs
- `docs/dev-route-inventory.md`
- `docs/routes-map.md`
- `docs/ci-and-guardrails.md`
