Status: Active
Last updated: 2025-11-30

# Bucket Rollover & Spend Semantics

This doc explains how bucket periods and spend tracking work today, what gaps remain, and what future behavior should look like. See `docs/legal-constraints.md` and `docs/cherry-vision.md` for broader guardrails.

## Current Schema (prisma/schema.prisma)
- Model: `Bucket`
  - `id`, `userId`, `name`
  - `period` (`BucketPeriod`: `WEEKLY` | `MONTHLY`)
  - `budgetAmount` (int, cents)
  - `currentAmount` (int, cents; set on create only, legacy)
  - `spentCents` (int, default 0; “spent this period”)
  - `strictMode` (boolean, default true)
  - `category` (`RewardCategory`)
  - `periodStart`, `periodEnd` (DateTime, defaults `now()`)
  - `lastResetAt` (DateTime?)
  - timestamps: `createdAt`, `updatedAt`

## Current Behavior (code reality)
- **Creation (`POST /api/buckets`)**
  - Computes weekly window (Monday 00:00 → next Monday 00:00) or monthly (first of month → first of next month) via `getPeriodWindow`.
  - Initializes `spentCents` to `budgetAmount - currentAmount` when `currentAmount` is provided, else `0`. Stores `periodStart`/`periodEnd`, `strictMode`, `category`.
  - `currentAmount` is not used after creation.

- **Rollover helpers**
  - `lib/buckets/periods.ts#applyInMemoryRollover` advances `periodStart`/`periodEnd` forward until `periodEnd > now`, resets `spentCents` to `0`, and marks `isExpired` when rollover happened. Multi-period gaps are covered by looping windows.
  - `lib/buckets/ensure-fresh.ts` fetches a bucket, applies the in-memory rollover, and persists `periodStart`/`periodEnd`/`spentCents`/`lastResetAt` when they changed.

- **Engine usage (`lib/engine.ts`)**
  - Loads buckets for the category, runs them through `applyInMemoryRollover`, and bases budget verdicts on `budgetAmount` + rolled `spentCents`.
  - Chooses the earliest-created bucket for the category (first in list). Ignores `currentAmount`.
  - Verdicts: `BORDERLINE` when <10% remains; `BREAKS_BUDGET` when spend would exceed `budgetAmount`; respects `strictMode` flag in outputs.

- **Spend mutation (`POST /api/sessions/[id]/confirm`)**
  - Ensures the recommended bucket is fresh via `ensureBucketFresh` before updates.
  - Increments `spentCents` by the claimed amount (or recommended amount when `actualAmountCents` is absent). Happens once per session because status checks block double-claims.
  - Does not currently decrement on verification failure; spend remains even if ledger rows are later revoked.

- **Other paths**
  - `/api/scan`, `/api/sessions`, `/api/vine/order`, `/api/simulate` do **not** mutate buckets.
  - Engine in-memory rollover means verdicts stay time-accurate even if the DB has not been refreshed yet; persistence happens on confirm via `ensureBucketFresh`.

## Gaps / Inconsistencies
- `currentAmount` is legacy and unused after creation; risks confusion as a second balance field.
- Spend is not reversed if verification rejects a claim; `spentCents` remains incremented.
- Bucket selection is naive (first created for a category) and ignores multiple buckets for the same category.
- No background job to pre-roll buckets; freshness relies on engine reads and confirm-time `ensureBucketFresh`.
- `lastResetAt` is only set when rollover occurs via `ensureBucketFresh`; initial creation leaves it null.

### Verification rejection semantics
- Current behavior: when a session is confirmed, `Bucket.spentCents` increments by the confirmed amount (`confirmedAmountCents` on `RecommendationSession`). On `verify(verified: true)`, the increment remains. On `verify(verified: false)`, if the session was confirmed and not yet reversed, the bucket spend is decremented by `confirmedAmountCents` (bounded at 0) and `bucketSpendReversed` is set on the session to avoid double reversal. Reversal uses `ensureBucketFresh` so the active period window is respected.

### Legacy fields and soft flags
- `Bucket.currentAmount` is a legacy field initialized on create; the canonical budget math uses `budgetAmount` + `spentCents` only.
- `CategoryPreference.category` is currently a string and treated as a soft “intentional unbudgeted” flag. Future migration may move this to a `RewardCategory` enum for stronger validation.

## Future / Target Behavior
- Keep `spentCents` as the single source of truth; remove or archive `currentAmount` from math.
- Consider deriving bucket selection rules (e.g., prioritize strict buckets) and document them.
- Add optional reversal or adjustment when verification fails, or mark rejected sessions for audit before reversing spend.
- Add periodic freshness sweeps or on-read hooks for other bucket consumers if more surfaces start relying on bucket windows.
- Expand tests around weekly/monthly rollover, gap handling, and strict-mode overspend enforcement.
