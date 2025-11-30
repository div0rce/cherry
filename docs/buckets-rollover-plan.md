# Bucket Rollover Plan (Phase 0 – Mapping Current State)

Status: mapping only. No code changes yet. This documents the current schema/behavior and observed gaps.

## Current Schema (prisma/schema.prisma)
- Model: `Bucket`
  - `id`, `userId`, `name`
  - `period` (`BucketPeriod` enum: `WEEKLY`, `MONTHLY`)
  - `budgetAmount` (cents)
  - `currentAmount` (remaining cents; set on create)
  - `spentCents` (int, default 0; intended “spent this period”)
  - `strictMode` (boolean)
  - `category` (`RewardCategory`)
  - `periodStart`, `periodEnd` (DateTime, default `now()`)
  - timestamps: `createdAt`, `updatedAt`
- No `lastResetAt` or similar anchor.
- Unique/indexes: none specific to rollover; default indexes on relations.

## Where Buckets Are Used Today
- Creation: `app/api/buckets/route.ts`
  - Uses `getPeriodWindow(period, now)` to set `periodStart`/`periodEnd` at create time (weekly starts Monday 00:00, monthly starts first of month).
  - Sets `spentCents = budgetAmount - currentAmount` if `currentAmount` provided, else 0.
  - No further rollover logic after creation.
- Engine: `lib/engine.ts`
  - Reads `spentCents` and `budgetAmount` to compute:
    - `spentBefore = spentCents`
    - `spentAfter = spentBefore + amountCents`
    - `remainingAfter = limit - spentAfter`
    - verdicts/strict mode flags.
  - Ignores `currentAmount`, `periodStart`, `periodEnd`.
- Other routes:
  - `/api/scan`, `/api/sessions`, `/api/vine/order` all rely on engine outputs; no bucket mutations.
  - `/api/sessions/[id]/confirm|verify` do not update buckets.
- Seed data: `lib/demo-seeder.ts` seeds `spentCents` values; no dynamic updates.

## How `spentCents` Is Mutated
- Only on bucket creation (and demo seed). No increments/updates elsewhere.
- Confirming sessions/ledger updates do **not** touch `spentCents`.
- Simulations (`/api/simulate`) do not mutate buckets.

## Period Fields Usage
- `periodStart` / `periodEnd` are set on create (weekly/monthly window) and never touched again.
- No reads in engine or UI; no rollover when time passes.

## Observed Problems
- Rollover is **never performed**; `periodStart`/`periodEnd` become stale.
- `spentCents` stays at its creation-time value; budget health drifts as time passes and as real spend occurs.
- Engine verdicts ignore period boundaries and time; they operate on stale `spentCents`.
- `currentAmount` is legacy/unused after creation, leading to double-source-of-truth risk.
- No anchor (`lastResetAt`) to prevent double resets or track rollover application.

## Next Steps (future phases)
- Define canonical rollover rules for WEEKLY/MONTHLY.
- Add centralized helper(s) for rollover and bucket freshness.
- Decide on balance source of truth (`spentCents` vs ledger-derived) and enforce updates on confirm/verify.
- Add tests for weekly/monthly rollover and multi-period gaps.

## Canonical Rollover Rules (Target Behavior)

- **Source of truth:** `spentCents` = “spent in current period.” Ledger (`CherryPointLedger`) is audit-only. `currentAmount` is legacy (set on create) and not used in future math.
- **When expired:** `now > periodEnd`.
- **On rollover:** advance `periodStart`/`periodEnd` forward by full periods until `periodEnd > now`; reset `spentCents = 0`.
- **Gap handling:** if multiple periods passed, still end with a single fresh window (`spentCents = 0`) covering `now`.

### WEEKLY
- Window: starts Monday 00:00 local; ends next Monday 00:00 local (per `getPeriodWindow` in creation path).
- Expiry: `now > periodEnd`.
- Rollover: move start/end forward in 7-day increments until `periodEnd > now`; reset `spentCents = 0`.

### MONTHLY
- Window: first day of month 00:00 local → first day of next month 00:00 local (per `getPeriodWindow` in creation path).
- Expiry: `now > periodEnd`.
- Rollover: advance start/end month-by-month until `periodEnd > now`; reset `spentCents = 0`.

## Real Spend Semantics (Target)
- Real spend is counted when a session is **claimed/confirmed** (first transition from recommended to claimed). Verification may change ledger status but does not double-count spend.
- Before incrementing bucket spend, apply rollover so spend always lands in the active window.
- Increment rule: `bucket.spentCents = fresh.spentCents + amountCents` where `amountCents` is the claimed (or recommended) amount for the session.
- Guardrails: only increment once per session; repeated claims should be blocked by status checks.

## Implementation Status
- Rollover helpers live in `lib/buckets/periods.ts` (in-memory) and `lib/buckets/ensure-fresh.ts` (DB-aware).
- Engine pipes buckets through in-memory rollover so verdicts reflect the current period even if DB is stale.
- `Bucket.lastResetAt` has been added to track when rollover was last applied; backfill script: `scripts/backfill_bucket_last_reset_at.ts`.
- Real spend increment happens in `/api/sessions/[id]/confirm`: bucket is freshened via `ensureBucketFresh` and `spentCents` is incremented once per claim.
- `currentAmount` remains legacy and is not used after creation; UI and engine rely on `budgetAmount` + `spentCents`.
