Status: Active
Last updated: 2026-01-03

# Dev Route Inventory

Policy: `(user)` routes are user-facing only; `(dev)` routes are dev console only and gated (middleware on `/dev/*` and `/api/dev/*`).
Invariant: Dev routes may read, simulate, and replay state; they must not mutate user-facing financial state (buckets, ledger, sessions) except via explicit admin tools guarded under `/admin`.

## Current behavior (enforced / in code)

### User-facing routes
- `/signin` — shared auth entry.
- `/app` and `/app/autopilot` — user shell surfaces.
- `/app/onboarding/*` — onboarding flows for buckets/cards/rules.
- `/buckets`, `/history` — user shell summaries.

### Dev-only routes
- `/dev` — dev console dashboard.
- `/dev/buckets`, `/dev/history`, `/dev/statements`, `/dev/statements/[statementId]`.
- `/dev/cards`, `/dev/cards/[cardId]`.
- `/dev/engine/inspector`, `/dev/engine/guardrails`.
- `/dev/ingest`, `/dev/bank`, `/dev/evaluator`, `/dev/activity`.
- `/scan`, `/simulate`, `/simulations`, `/simulations/[simulationId]`, `/sessions`, `/sessions/[id]`.
- `/scan` — advisory-only surface that is user-semantic but currently dev-gated. Promotion to user shell requires explicit product approval and copy review per `docs/cherry-vision.md`.
- `/activity` — engine/ledger activity timeline (dev-only surface).
- `/activity` is a legacy dev surface retained for compatibility; `/dev/activity` is the canonical inspector going forward.
- `/vine-simulator`, `/bank-simulator`, `/admin`.

## Future/Target behavior (explicitly speculative)
- Implement marketing routes under `app/(marketing)` and update this inventory once live.
- Decide on legacy aliases in `lib/routes.ts` and either implement or remove them.

## Related docs
- `docs/routes-map.md`
- `docs/information-architecture.md`
- `docs/shell-architecture.md`
