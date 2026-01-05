Status: Active
Last updated: 2026-01-03

# Cherry Core Loop / Engine / Vine / Wallet Pass Audit (Verified)

Cross-links: see `docs/cherry-vision.md`, `docs/legal-constraints.md`, `docs/cherry-vine.md`, `docs/wallet-pass.md`, `docs/api.md`, and `docs/buckets-rollover-plan.md` for identity, legal, Vine, wallet, API, and bucket details.

This is the canonical, implementation-ready audit of Cherry’s Observe → Evaluate → Recommend → Reward loop, aligned with `docs/legal-constraints.md` and `docs/cherry-vision.md`.

## 0. Scope and Sources
Audited areas: advisory scan, sessions/ledger, buckets/engine, Vine ingest, Wallet Pass scaffold.

Code inspected:
- Prisma schema: `prisma/schema.prisma` (Bucket, RecommendationSession, CherryPointLedger, Card/RewardRule, etc.).
- Engine and helpers: `lib/engine.ts`, `lib/engine-invariants.ts`, `lib/scan-helpers.ts`, `lib/buckets/periods.ts`, `lib/buckets/ensure-fresh.ts`, `lib/buckets-runtime.ts`.
- Sessions/ledger APIs: `app/api/sessions/route.ts`, `app/api/sessions/[id]/route.ts`, `app/api/sessions/[id]/confirm/route.ts`, `app/api/sessions/[id]/verify/route.ts`, `lib/verification/verify-session.ts`.
- Advisory scan API: `app/api/scan/route.ts`, `lib/schemas/scan.ts`.
- Vine ingest: `app/api/vine/order/route.ts`, `lib/vine/order-context.ts`, `lib/vine/run-recommendation.ts`, `lib/schemas/vine.ts`, `lib/schemas/vine-terminal.ts`.
- Wallet pass: `app/api/wallet/cherry-pass/route.ts`, `lib/wallet/config.ts`, `lib/wallet/cherryPass.ts`.
- Auth helpers: `lib/auth.ts`, `lib/with-user.ts`, `app/api/auth/[...nextauth]/route.ts`.
- Legacy simulation engine: `lib/simulation.ts` (archived; not used by core routes).
- Tests: `tests/*.test.js`.

Docs consulted:
- `docs/legal-constraints.md`, `docs/cherry-vision.md`, `docs/cherry-vine.md`, `docs/wallet-pass.md`, `docs/api.md`, `docs/buckets-rollover-plan.md`, `docs/system-overview.md`, `docs/repo-structure.md`, `AGENTS.md`, `.github/copilot-instructions.md`.

## 1. Current behavior (verified)
- Bank ingest (new):
  - Dev-only endpoint `app/api/dev/bank/ingest/route.ts` validates `RawBankTransaction` payloads (`lib/schemas/bank-ingest.ts`) and upserts `BankTransaction` rows idempotently via `lib/bank/ingest.ts`, linking optional `MerchantObservation`.
  - Unified activity and statements surface these rows; admin console includes a “Bank ingest debug” panel to paste payloads and dump recent rows.
- Verification (wired):
  - `lib/verification/verify-session.ts` implements `verifySessionFromSignal` with amount/time/merchant matching and bucket reversal on rejection; invoked by `/api/sessions/[id]/verify` and `/api/dev/verification/trigger`.
  - `docs/verification-flow.md` documents signal shape; auto-trigger from ingest is still a follow-up (signals can be queued).
- Advisory scan (`POST /api/scan`, `app/api/scan/route.ts`):
  - Resolves user context (`resolveUserContext`, `requireAuth: false`, `allowLabDemo: true`); parses `ScanRequestSchema` (`lib/schemas/scan.ts`, non-negative `expectedAmountCents`).
  - Category resolution uses `resolveScanCategory` (`lib/scan-helpers.ts`) with precedence: explicit → MCC map → last simulated merchant category → heuristics → `OTHER`.
  - `amountCents` defaults to 0 if missing/invalid; `runEngine` accepts 0 (guards only `amountCents < 0` in `lib/engine.ts`); incentives become 0 for amount <= 0.
  - No sessions/ledger writes; logs a `DecisionEvent` when authority returns `ok: true`.

- Authority invariant:
  - `authority_v1` is advisory and telemetry-only; it never mutates buckets, sessions, ledger rows, or user state.
  - Any future authority version that affects state requires a version bump plus explicit legal/spec review.

- Engine (`lib/engine.ts`, `lib/engine-invariants.ts`):
  - Resolves category (MCC → explicit → heuristics).
  - Fetches buckets for the category; applies `applyInMemoryRollover` (`lib/buckets/periods.ts`) to advance weekly/monthly windows, normalizes via `toBucketRuntime` (`lib/buckets-runtime.ts`) to attach `committedCents`/`remainingCents`, and picks the earliest-created bucket.
  - Budget verdicts/guardrails computed from `remainingCents` (not raw `limitCents`); strictness flagged but no decline logic here.
  - Card selection chooses best multiplier rule per category (fallback GENERAL_MERCHANDISE/OTHER) and estimates rewards; if no cards, verdict `NO_CARD_DATA`.
  - Incentives: base `min(floor(amount/1000), 20)`, doubled for `HEALTHY`, zeroed for `BREAKS_BUDGET`; zero if `amountCents <= 0`.
  - Invariants enforce consistency (no incentives with `INSUFFICIENT_DATA` or `NO_CARD_DATA`, coverage mode matches bucket presence, etc.).

- Buckets (`prisma/schema.prisma`, `app/api/buckets/route.ts`, `lib/buckets/*`, `lib/buckets-runtime.ts`):
  - Schema fields: `budgetAmount` (limit), `spentCents` (posted), `currentAmount` (legacy mirror), `strictMode`, `periodStart/periodEnd`, `lastResetAt`.
  - Canonical math: `computeBucketBalanceFromNumbers` (pending=0 today) → `committedCents` and `remainingCents` (clamped at 0); `currentAmount` is written as the derived remaining for legacy consumers.
  - Creation sets weekly window (Monday 00:00) or monthly (1st → next 1st), derives balances via `computeBucketBalanceFromNumbers`, and persists `budgetAmount`/`spentCents`/`currentAmount`.
  - `ensureBucketFresh` applies in-memory rollover, recomputes balances, and persists updated `periodStart`/`periodEnd`/`spentCents`/`currentAmount`/`lastResetAt` when stale.
  - Reversal of `spentCents` on verification rejection is handled by `verifySessionFromSignal`. Reversal is idempotent and guarded (`bucketSpendReversed`), bounded at zero, and always applies after `ensureBucketFresh` to respect active period windows.

- Sessions & ledger:
  - Creation (`POST /api/sessions`, `app/api/sessions/route.ts`):
    - Auth via `withUser`, validates `CreateSessionSchema` (`lib/schemas/sessions.ts`, `amountCents` strictly positive).
    - Runs `runEngine`; stores `RecommendationSession` with `source` default `APP_SCAN`, `orderToken` UUID, expiry ~15 minutes, verdicts, coverageMode, cherryPointsOffered.
  - Fetch by id (`GET /api/sessions/[id]`): returns full session plus `pointsPending`/`pointsPosted` computed from ledger rows; marks `isExpired` if `expiresAt` <= now.
  - Confirm (`POST /api/sessions/[id]/confirm`, `app/api/sessions/[id]/confirm/route.ts`):
    - Blocks missing/expired/claimed/verified/rejected sessions.
    - Anomalies: amount ratio outside 0.85–1.15 → `AMOUNT_MISMATCH`; claim older than 24h → `TIME_WINDOW_VIOLATION`; card mismatch → `CARD_MISMATCH`.
    - Freshens bucket via `ensureBucketFresh` and increments `spentCents` by claimed/recommended amount once per session.
    - Writes `CherryPointLedger` row(s) with `status = PENDING`, anomaly mirrored to ledger code `SESSION_ANOMALOUS`.
    - Calls `autoVerifySession` (stub returns null).
  - Verify (`POST /api/sessions/[id]/verify`, `app/api/sessions/[id]/verify/route.ts`):
    - Delegates to `verifySessionFromSignal` (amount/time/merchant match with override), sets `status` and `verificationStatus`, and updates ledger PENDING → POSTED/REVOKED with anomaly propagation.
    - Bucket reversal now handled when rejecting sessions that previously incremented `spentCents`.
  - Ledger model: `CherryPointLedger.status` default `PENDING` in schema; anomaly flags stored separately; linked to `sessionId`, `cardId`, `merchantObservationId`.

- Vine ingest (`app/api/vine/order/route.ts`):
  - Auth via `withUser`; reads request body once.
  - Accepts either terminal-event form (`lib/schemas/vine-terminal.ts`) or `OrderContext` form (`lib/schemas/vine.ts`); MCC optional but validated by `isValidMcc` when present.
  - Rejects stale payloads older than ~3 minutes (`ageMs > maxAgeMs`).
  - Maps to `OrderContext` (`lib/vine/order-context.ts`), runs solver via `safeSolveDecisionForWorld` inside `runRecommendationFromOrderContext` (a thin wrapper around `safeSolveDecisionForUser` with a World-injected runtime) and maps to legacy shape, then creates `RecommendationSession` with `source` set to `VINE_SIM` or `VINE_DEVICE`, `orderToken` from nonce or UUID, expiry ~15 minutes.
  - Runs `simulateSpendAuthority` and logs `DecisionEvent` telemetry when authority returns `ok: true`.
  - Returns `{ sessionId, decision, orderToken, authority }`. HMAC/nonce auth is TODO.

- Wallet Pass (`app/api/wallet/cherry-pass/route.ts`):
  - Auth via `withUser`. Uses `getWalletPassConfigStatus` (`lib/wallet/config.ts`): requires `CHERRY_WALLET_PASS_ENABLED=true` and Apple Wallet env vars (team ID, pass type ID, org name, description, cert password/path, WWDR path).
  - If misconfigured/disabled: returns `501` JSON `{ error: "wallet_pass_not_configured", reason, message }`.
  - When configured: generates `storeCard` pass via `generateCherryPass` (`lib/wallet/cherryPass.ts`); placeholders for points; never a payment pass.

- Auth stack:
  - NextAuth (PrismaAdapter) with Email, Google, and dev Credentials (non-prod) in `app/api/auth/[...nextauth]/route.ts`.
  - `withUser` (`lib/with-user.ts`) pulls `getServerSession` userId; returns 401 otherwise.

- Tests:
  - Engine invariants, wallet-pass config, bucket periods, engine bucket remaining vs total limit, vine order mapping, and client API smoke tests in `tests/*.test.js`; all passing as of this audit.

### State hierarchy (mental model)
- Authoritative events: `RecommendationSession`, `CherryPointLedger`.
- Derived state: `Bucket` (period-scoped cache).
- Advisory signals: authority decisions, scan results.
- Engine: pure evaluation over current derived + authoritative state.

## 2. Gaps vs Vision / Legal Constraints
- Verification is still manual/explicit: signals are processed, but ingest does not auto-queue verification; production flow needs webhook-driven or worker-triggered signals.
- Bank ingest is dev-only: no provider auth/signature validation, and user mapping is limited to email/providerAccountId.
- Vine security is minimal: signature enforcement remains optional/off by default; nonce cleanup and device lifecycle are missing.
- Legacy/duplicate engine logic in `lib/simulation.ts` (archived) still exists; while balance math now reuses canonical helper, the separate category resolver risks drift if revived.
- Wallet pass generation still reads certs when fully enabled; acceptable, but ensure feature flag stays off by default to avoid accidental filesystem access. Currently compliant.
- Bucket cadence is confirm-only with one exception: `/api/autopilot/commit` may apply bucket deltas for simulated commits. There is no per-transaction ledger, no per-swipe balance update, no stale-data fallback, and no daily reconciliation sweep. Autopilot can therefore operate on stale budgets.

## 3. Risks and Impact (Ranked)
- High — Verification path needs automation:
  - Impact: ledger posting relies on manual API calls; without webhook/worker wiring, PENDING rows can linger. Evidence: `verifySessionFromSignal` exists, but nothing enqueues signals from ingest yet.
- Medium — Vine lacks enforced auth:
  - Impact: spoofed Vine events could create sessions with misleading recommendations. Evidence: `app/api/vine/order/route.ts` signature mode defaults to off; no device lifecycle/nonce cleanup.
- Medium — Legacy simulation engine drift:
  - Impact: future contributors might reuse `lib/simulation.ts` and diverge from canonical engine (rollover/incentive rules) even though balances now use the shared helper. Evidence: separate `resolveCategory`/card logic in `lib/simulation.ts` not used by main APIs.

## 4. Concrete Fixes / Migrations
- Verification automation:
  - Enqueue verification signals from ingest (bank/Vine/receipts) and drain via worker calling `verifySessionFromSignal`. Add metrics on pending vs posted/revoked.
- Vine hardening:
  - Add HMAC/nonce verification and device registry table; validate signatures in `app/api/vine/order/route.ts` before running the engine. Update `docs/cherry-vine.md` and `docs/api.md` with signature format and failure modes.
  - Add cleanup (cron/script) to mark expired Vine-created `RecommendationSession` rows as `EXPIRED` and invalidate tokens.
- Engine/Simulation consolidation:
  - Keep `lib/simulation.ts` marked legacy or refactor any future callers to use `safeSolveDecisionForUser`; ensure any remaining uses either import the canonical engine or are archived.
- Schema/ingest hygiene:
  - Consider adding provider IDs/unique constraints to `BankTransaction` instead of overloading `id`, and wire webhook auth; keep ingest idempotent and auditable.
  - Keep `currentAmount` documented as legacy-only; rely on `lib/buckets-runtime.ts` for derived balances and avoid surfacing `currentAmount` in UI math.
- Bucket cadence:
  - Add a bucket ledger keyed by `(tx_id, bucket_id, period_id)`; update balances on every authorization/posting or reclassification.
  - Recompute targets on pay-period start/paycheck/plan edits; keep engine decisions per swipe and add a stale-data fallback (safe default card + log).
  - Run a daily reconciliation sweep to re-sync feeds, recompute spent/remaining/derived metrics, and mark Autopilot degraded on failure.

## 5. Short-Term Plan (Implementation Checklist)
1) Verification automation:
   - Queue verification signals from ingest (bank/Vine/receipts) and drain via worker calling `verifySessionFromSignal`; add metrics on pending vs posted/revoked.
2) Bank ingest hardening:
   - Add provider auth/signature and webhook handler; expand user mapping beyond email/providerAccountId; convert dev endpoint into an authenticated provider entrypoint.
3) Vine security + cleanup:
   - Enforce signature mode by default, add device lifecycle/nonce cleanup, and document failure modes in `docs/cherry-vine.md`/`docs/api.md`.
4) Observability/rate limits:
   - Instrument engine/sessions/ingest/verification paths with structured logs + basic rate limiting on public APIs.

## Future/Target behavior (explicitly speculative)
- Automated verification signals from real bank/receipt sources with worker-backed posting.
- Signed Vine payloads with enforced device lifecycle.
- Bucket ledger for per-transaction reconciliation.
- Expanded observability and rate limiting across public APIs.

## Related docs
- `docs/cherry-vision.md`
- `docs/legal-constraints.md`
- `docs/api.md`
