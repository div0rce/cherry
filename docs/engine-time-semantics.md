Status: Active
Last updated: 2026-04-26

# Engine Time Semantics

This document is the canonical temporal contract for Cherry's live engine.

## Canonical `decisionTimeMs`

- `decisionTimeMs` is the only engine "now".
- The live engine evaluates a single present-time step.
- Live recommendation uses authorization-effective present-state semantics.
- Debit purchase effects reduce spendable liquid immediately for ranking.
- Credit purchase effects increase liability/utilization immediately for ranking.

## `IMMEDIATE` vs `SCHEDULED`

- `IMMEDIATE` means effective at `decisionTimeMs`.
- `SCHEDULED` means effective at `effectiveAtMs`.
- Only events with `effectiveAtMs <= decisionTimeMs` may mutate present ranking state.
- Events with `effectiveAtMs > decisionTimeMs` are future-only.

## Authorization-Effective Present-State Semantics

- Purchase effects are authorization-effective for present recommendation ranking.
- Debit purchase effects reduce present liquidity immediately.
- Credit purchase effects mutate only the linked present liability and utilization.
- The live engine does not infer a card or debt relationship from labels, nicknames, or display names.

## Pending vs Posted Bookkeeping Only

- Bucket `pendingSpendCents` and `postedSpendCents` are bookkeeping fields.
- Pending and posted fields are not a posting, reversal, cancellation, settlement, or statement-cycle lifecycle simulator.
- The live engine does not simulate posting, reversal, cancellation, settlement lag, or statement-cycle transitions for recommendation ranking.

## Scheduled paydowns

- Scheduled paydowns are retained in engine state as raw source data.
- The loader does not classify them as present or future.
- `lib/engine/scheduled-paydowns.ts` performs the present-vs-future split exactly once.
- Simulation consumes only the evaluated `presentEffective` subset.
- Future contingent response logic consumes only the evaluated `futureEligible` subset.
- Routes must only orchestrate and must not recompute scheduled-paydown temporal truth.

## Already-Effective Anti-Duplication

- A scheduled paydown with `effectiveAtMs <= decisionTimeMs` is normalized into the present-effective path exactly once.
- Pre-existing present-effective scheduled paydowns reduce before candidate actions at the same `effectiveAtMs`.
- `USE_CARD_WITH_PAYDOWN` preserves purchase-before-paydown ordering within the candidate action.
- A scheduled paydown with `effectiveAtMs > decisionTimeMs` is future-only.

## Future-Only Exclusion

Future-only scheduled paydowns may affect only:
- `contingentRecommendation`
- `futureRiskContext`
- explicit future explanatory text

Future-only scheduled paydowns may not affect:
- present feasibility
- present liquidity
- present liability
- present utilization
- present score
- present degradation
- present winner selection

## `paydownScheduledDateMs` Legacy Input Only

- `paydownScheduledDateMs` remains a legacy-boundary-only input field.
- Engine timing semantics are expressed as `decisionTimeMs` and `effectiveAtMs`.
- `paydownScheduledDateMs` must not be treated as an independent lifecycle replay field.

## Non-goals

This contract does not add:
- generic future purchase recommendation search
- generic multistep optimization
- broad future-obligation forecasting
- a full payment-rail lifecycle simulator
- posting, reversal, cancellation, or settlement lifecycle replay
