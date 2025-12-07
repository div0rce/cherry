Status: Active
Last updated: 2025-12-05

# Bucket Rollover & Spend Semantics

This doc explains how bucket periods and spend tracking work today, what gaps remain, and what future behavior should look like. See `docs/legal-constraints.md` and `docs/cherry-vision.md` for broader guardrails.

## Current Schema (prisma/schema.prisma)
- Model: `Bucket`
  - `id`, `userId`, `name`
  - `period` (`BucketPeriod`: `WEEKLY` | `MONTHLY`)
  - `budgetAmount` (int, cents; canonical limit)
  - `currentAmount` (int, cents; legacy mirror of remaining on writes only)
  - `spentCents` (int, default 0; posted/settled spend this period)
  - `strictMode` (boolean, default true)
  - `category` (`RewardCategory`)
  - `periodStart`, `periodEnd` (DateTime, defaults `now()`)
  - `lastResetAt` (DateTime?)
  - timestamps: `createdAt`, `updatedAt`
  - Runtime/derived (not stored): `pendingSpendCents` (0 today), `committedCents = spentCents + pendingSpendCents`, `remainingCents = max(0, budgetAmount - committedCents)` via `lib/buckets-runtime.ts`.

## Current Behavior (code reality)
- Canonical balance math lives in `lib/buckets-runtime.ts` (`computeBucketBalanceFromNumbers`/`toBucketRuntime`). All surfaces (engine, seeds/admin, `/api/buckets`) rely on it; no ad hoc remaining calculations.

- **Creation (`POST /api/buckets`)**
  - Computes weekly window (Monday 00:00 → next Monday 00:00) or monthly (first of month → first of next month) via `getPeriodWindow`.
  - Uses `computeBucketBalanceFromNumbers` (pending=0) to derive `spentCents`/`committedCents`/`remainingCents`; writes `currentAmount` as the derived remaining for legacy consumers. Stores `periodStart`/`periodEnd`, `strictMode`, `category`.

- **Rollover helpers**
  - `lib/buckets/periods.ts#applyInMemoryRollover` advances `periodStart`/`periodEnd` forward until `periodEnd > now`, resets `spentCents` to `0` (and `currentAmount` to `budgetAmount`), and marks `isExpired` when rollover happened. Multi-period gaps are covered by looping windows.
  - `lib/buckets/ensure-fresh.ts` fetches a bucket, applies the in-memory rollover, recomputes balances via `computeBucketBalanceFromNumbers`, and persists `periodStart`/`periodEnd`/`spentCents`/`currentAmount`/`lastResetAt` when they changed.

- **Engine usage (`lib/engine.ts`)**
  - Loads buckets for the category, runs them through `applyInMemoryRollover`, normalizes via `toBucketRuntime`, and bases budget verdicts/guardrails on `remainingCents` (not raw `limitCents`).
  - Chooses the earliest-created bucket for the category (first in list).
  - Verdicts: `BORDERLINE` when <10% remains; `BREAKS_BUDGET` when spend would exceed `budgetAmount`; respects `strictMode` flag in outputs.

- **Spend mutation (`POST /api/sessions/[id]/confirm`)**
  - Ensures the recommended bucket is fresh via `ensureBucketFresh` before updates.
  - Increments `spentCents` by the claimed amount (or recommended amount when `actualAmountCents` is absent). Happens once per session because status checks block double-claims.
  - Does not currently decrement on verification failure; spend remains even if ledger rows are later revoked.
  - Cadence today: bucket spend only changes on session confirm (and optional reversal on verify-reject); bank ingest, scans, and simulations do not mutate bucket balances.

- **Other paths**
  - `/api/scan`, `/api/sessions`, `/api/vine/order`, `/api/simulate` do **not** mutate buckets.
  - Engine in-memory rollover means verdicts stay time-accurate even if the DB has not been refreshed yet; persistence happens on confirm via `ensureBucketFresh`.

### Example balance
- limit = $100 (`budgetAmount = 10_000`)
- posted spend = $75 (`spentCents = 7_500`), pending = 0
- committed = $75
- remaining = $25 (`remainingCents = 2_500`, `currentAmount` mirrors this on write)
- A $50 attempt is over budget because $50 > $25 remaining even though $50 < $100 total limit.

## Gaps / Inconsistencies
- Spend is not reversed if verification rejects a claim; `spentCents` remains incremented.
- Bucket selection is naive (first created for a category) and ignores multiple buckets for the same category.
- No background job to pre-roll buckets; freshness relies on engine reads and confirm-time `ensureBucketFresh`.
- `lastResetAt` is only set when rollover occurs via `ensureBucketFresh`; initial creation leaves it null.
- Cadence is confirm-only: there is no per-transaction bucket ledger, no per-purchase balance updates, and no daily reconciliation sweep; Autopilot can operate on stale spend if ingests lag.

### Verification rejection semantics
- Current behavior: when a session is confirmed, `Bucket.spentCents` increments by the confirmed amount (`confirmedAmountCents` on `RecommendationSession`). On `verify(verified: true)`, the increment remains. On `verify(verified: false)`, if the session was confirmed and not yet reversed, the bucket spend is decremented by `confirmedAmountCents` (bounded at 0) and `bucketSpendReversed` is set on the session to avoid double reversal. Reversal uses `ensureBucketFresh` so the active period window is respected.

### Legacy fields and soft flags
- `Bucket.currentAmount` exists only as a legacy mirror of derived remaining; compute balances via `lib/buckets-runtime.ts` instead of reading it.
- `CategoryPreference.category` is now a `RewardCategory` enum; no arbitrary strings are allowed (legacy string field has been migrated).

## Future / Target Behavior
- Keep `lib/buckets-runtime.ts` as the single source of truth for committed/remaining math; avoid adding alternative “remaining” fields.
- Consider deriving bucket selection rules (e.g., prioritize strict buckets) and document them.
- Add optional reversal or adjustment when verification fails, or mark rejected sessions for audit before reversing spend.
- Add periodic freshness sweeps or on-read hooks for other bucket consumers if more surfaces start relying on bucket windows.
- Expand tests around weekly/monthly rollover, gap handling, and strict-mode overspend enforcement.
- Cadence (v1 spec):
  - Balances: update per purchase/authorization and again on posting or reclassification. Each transaction writes an immutable bucket ledger row `(tx_id, bucket_id, amount, period_id)`; settlement edits adjust the ledger entry and recompute `spentCents`, `remainingCents`, and `percent_used`.
  - Targets/allocations: recompute on pay-period boundaries or when income events/plan edits happen (monthly/biweekly or explicit paycheck); persist `bucket_target_amount` per `(bucket_id, period_id)`. No daily recompute needed.
  - Engine policy: per swipe, pull the freshest bucket balance, compute `remaining = target - spent`, and route accordingly (`remaining <= 0` → warn/avoid; soft threshold → nudge; else optimize rewards). If data is stale (e.g., last ingest > 12h), fall back to the safe default card and log “data stale.”
  - Reconciliation: run daily to re-sync feeds, ensure all transactions are bucketed, recompute derived metrics, and verify invariants (`sum(bucket_spent) ≈ total_spend`, period boundaries intact). If reconciliation fails, mark Autopilot as degraded until corrected.
  - Cadence stance: weekly-only updates are insufficient; balances must be event-driven, with daily sweeps for safety and pay-period recomputes for targets.
