Status: Active
Last updated: 2025-12-25

# Adapters

## Current behavior
- Adapter contracts live in `lib/adapters/*` and are pure TypeScript types only.
- Runtime adapter implementations live under `lib/adapters/runtime/*` and assemble a `World`.
- Engine/authority time is numeric (`nowMs`); adapter layers convert `Date ↔ ms`.
- Idempotency keys are per-user (`(userId, key)`), persisted via `IdempotencyStore`.

## Future/Target behavior
- Engine code imports only `lib/adapters/*` plus pure type modules.
- Side effects live exclusively in adapter implementations and boundary layers.
- Engine execution is deterministic given inputs plus a `World` instance.
