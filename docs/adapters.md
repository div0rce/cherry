Status: Active
Last updated: 2026-01-03

# Adapters

## Current behavior (enforced / in code)
- Adapter contracts live in `lib/adapters/*` and are pure TypeScript types only.
- Runtime adapter implementations live under `lib/adapters/runtime/*` and assemble a `World`.
- Engine code must never import from `lib/adapters/runtime/*`; only boundary layers may do so.
- Engine/authority time is numeric (`nowMs`); adapter layers convert `Date ↔ ms`.
- Idempotency keys are per-user (`(userId, key)`), persisted via `IdempotencyStore`.

## Future/Target behavior
- Engine code imports only `lib/adapters/*` plus pure type modules.
- Side effects live exclusively in adapter implementations and boundary layers.
- Engine execution is deterministic given inputs plus a `World` instance.

## Related docs
- `docs/authority-v1.md`
- `docs/cherry-vision.md`
- `docs/ci-and-guardrails.md`
