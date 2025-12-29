Status: Active
Last updated: 2025-12-28

# Dev UI Parity

Cherry policy: no important backend behavior is allowed to exist without a Dev Console surface.

## Current behavior

| Backend feature ID | Description | Code location | Effect | Dev UI surface | Status |
|--------------------|-------------|---------------|--------|----------------|--------|
| ENGINE_DECISION_CORE | Core decision solver and ranking of EngineDecision[] | lib/engine/solver.ts | Determines which card/action Cherry recommends | /dev/engine/inspector | implemented |
| GUARDRAILS_CORE | Hard + soft guardrails for unsafe spend, delays, and runway breaches | lib/engine/guardrails.ts | Blocks unsafe actions before scoring + tags soft warnings | /dev/engine/guardrails | implemented |
| SESSIONS_LIFECYCLE | Recommendation sessions create/confirm/verify | app/api/sessions/* | Persists advisory sessions and point offers | /sessions | implemented |
| BANK_INGEST_PIPELINE | Bank ingest upsert pipeline and CSV dev ingest | lib/bank/ingest.ts | Normalizes external bank events into BankTransaction | /dev/ingest, /dev/bank, /bank-simulator | implemented |
| VINE_CONTEXT_PIPELINE | Vine BLE/NFC ingest + run recommendation shim | lib/vine/run-recommendation.ts | Translates Vine device payloads into recommendation sessions | /vine-simulator | implemented |
| BUCKET_RUNTIME_GUARDRAILS | Bucket runtime math and guardrails | lib/buckets-runtime.ts | Computes remaining/committed spend for guardrails | /buckets | implemented |
| OFFLINE_EVALUATOR | Offline evaluator against historical spend | lib/evaluator/offline-history.ts | Scores historical spend snapshots for diagnostics | /dev/evaluator | implemented |
| INVARIANTS_AND_ASSUMPTIONS | Engine invariants + guardrail enforcement checks | lib/engine-invariants.ts, `check:guardrails-core` | Validates solver + session guardrails before deploy | /admin (Invariants panel) | implemented |

Script hook: `check:dev-ui-parity` logs the current implemented vs missing counts (non-blocking for now).

## Future/Target behavior

- TODO: Add parity coverage for new backend subsystems as they ship.
