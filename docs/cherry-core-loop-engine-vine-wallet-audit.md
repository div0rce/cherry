Status: Active
Last updated: 2025-11-30

# Cherry Core Loop / Engine / Vine / Wallet Pass Audit (Verified)

Cross-links: see `docs/cherry-vision.md`, `docs/legal-constraints.md`, `docs/cherry-vine.md`, `docs/wallet-pass.md`, `docs/api.md`, and `docs/buckets-rollover-plan.md` for identity, legal, Vine, wallet, API, and bucket details.

This is the canonical, implementation-ready audit of Cherry’s Observe → Evaluate → Recommend → Reward loop, aligned with `docs/legal-constraints.md` and `docs/cherry-vision.md`.

## 0. Scope and Sources
Audited areas: advisory scan, sessions/ledger, buckets/engine, Vine ingest, Wallet Pass scaffold.

Code inspected:
- Prisma schema: `prisma/schema.prisma` (Bucket, RecommendationSession, CherryPointLedger, Card/RewardRule, etc.).
- Engine and helpers: `lib/engine.ts`, `lib/engine-invariants.ts`, `lib/scan-helpers.ts`, `lib/buckets/periods.ts`, `lib/buckets/ensure-fresh.ts`.
- Sessions/ledger APIs: `app/api/sessions/route.ts`, `app/api/sessions/[id]/route.ts`, `app/api/sessions/[id]/confirm/route.ts`, `app/api/sessions/[id]/verify/route.ts`, `lib/verification/verify-session.ts`.
- Advisory scan API: `app/api/scan/route.ts`, `lib/schemas/scan.ts`.
- Vine ingest: `app/api/vine/order/route.ts`, `lib/vine/order-context.ts`, `lib/vine/run-recommendation.ts`, `lib/schemas/vine.ts`, `lib/schemas/vine-terminal.ts`.
- Wallet pass: `app/api/wallet/cherry-pass/route.ts`, `lib/wallet/config.ts`, `lib/wallet/cherryPass.ts`.
- Auth helpers: `lib/auth.ts`, `lib/with-user.ts`, `app/api/auth/[...nextauth]/route.ts`.
- Legacy simulation engine: `lib/simulation.ts` (not used by core routes but relevant for drift).
- Tests: `tests/*.test.js`.

Docs consulted:
- `docs/legal-constraints.md`, `docs/cherry-vision.md`, `docs/cherry-vine.md`, `docs/wallet-pass.md`, `docs/api.md`, `docs/buckets-rollover-plan.md`, `docs/master.md`, `docs/repo-structure.md`, `AGENTS.md`, `.github/copilot-instructions.md`.

## 1. Current Behavior (Verified)
- Advisory scan (`POST /api/scan`, `app/api/scan/route.ts`):
  - Auth via `withUser`; parses `ScanRequestSchema` (`lib/schemas/scan.ts`, non-negative `expectedAmountCents`).
  - Category resolution uses `resolveScanCategory` (`lib/scan-helpers.ts`) with precedence: explicit → MCC map → last simulated merchant category → heuristics → `OTHER`.
  - `amountCents` defaults to 0 if missing/invalid; `runEngine` accepts 0 (guards only `amountCents < 0` in `lib/engine.ts`); incentives become 0 for amount <= 0.
  - Stateless: no DB writes; returns bucket/card verdicts plus `engineDecision`.

- Engine (`lib/engine.ts`, `lib/engine-invariants.ts`):
  - Resolves category (MCC → explicit → heuristics).
  - Fetches buckets for the category; applies `applyInMemoryRollover` (`lib/buckets/periods.ts`) to advance weekly/monthly windows and reset `spentCents` to 0 when expired; picks the earliest-created bucket.
  - Budget verdicts computed from `budgetAmount` + rolled `spentCents`; strictness flagged but no decline logic here.
  - Card selection chooses best multiplier rule per category (fallback GENERAL_MERCHANDISE/OTHER) and estimates rewards; if no cards, verdict `NO_CARD_DATA`.
  - Incentives: base `min(floor(amount/1000), 20)`, doubled for `HEALTHY`, zeroed for `BREAKS_BUDGET`; zero if `amountCents <= 0`.
  - Invariants enforce consistency (no incentives with `INSUFFICIENT_DATA` or `NO_CARD_DATA`, coverage mode matches bucket presence, etc.).

- Buckets (`prisma/schema.prisma`, `app/api/buckets/route.ts`, `lib/buckets/*`):
  - Schema fields: `budgetAmount`, `currentAmount` (legacy after create), `spentCents` (default 0), `strictMode` default true, `periodStart/periodEnd` defaults now, `lastResetAt` optional.
  - Creation sets weekly window (Monday 00:00) or monthly (1st → next 1st) and initializes `spentCents = budgetAmount - currentAmount` when `currentAmount` provided.
  - `ensureBucketFresh` applies in-memory rollover and persists updated `periodStart`/`periodEnd`/`spentCents`/`lastResetAt` when stale.
- Verification rejection now reverses bucket spend once: when a confirmed session is rejected, `Bucket.spentCents` is decremented by `confirmedAmountCents` (bounded at 0) and `bucketSpendReversed` is set to prevent double reversals.

- Sessions & ledger:
  - Creation (`POST /api/sessions`, `app/api/sessions/route.ts`):
    - Auth via `withUser`, validates `CreateSessionSchema` (`lib/schemas/sessions.ts`, `amountCents` strictly positive).
    - Runs `runEngine`; stores `RecommendationSession` with `source` default `APP_SCAN`, `orderToken` UUID, expiry ~15 minutes, verdicts, coverageMode, cherryPointsOffered.
  - Fetch by id (`GET /api/sessions/[id]`): returns full session plus `pointsPending`/`pointsPosted` computed from ledger rows; marks `isExpired` if `expiresAt` <= now.
  - Confirm (`POST /api/sessions/[id]/confirm`, `app/api/sessions/[id]/confirm/route.ts`):
    - Blocks missing/expired/claimed/verified/rejected sessions.
    - Anomalies: amount ratio outside 0.85–1.15 → `AMOUNT_MISMATCH`; claim older than 24h → `TIME_WINDOW_VIOLATION`; card mismatch → `CARD_MISMATCH`.
    - Freshens bucket via `ensureBucketFresh` and increments `spentCents` by claimed/recommended amount once per session; records `confirmedAmountCents` on the session and resets `bucketSpendReversed` to false.
    - Writes `CherryPointLedger` row(s) with `status = PENDING`, anomaly mirrored to ledger code `SESSION_ANOMALOUS`.
    - Calls `autoVerifySession` (stub returns null).
  - Verify (`POST /api/sessions/[id]/verify`, `app/api/sessions/[id]/verify/route.ts`):
    - Sets session to `VERIFIED` or `REJECTED`, `verificationStatus` accordingly; anomaly escalates to `VERIFICATION_CONFLICT` if rejecting a clean session.
    - Updates PENDING ledger rows to `POSTED` (verified) or `REVOKED` (rejected); sets anomaly code if present.
    - Reverses bucket spend exactly once when `verified=false` and `confirmedAmountCents` is set, using `bucketSpendReversed` to prevent double reversals.
  - Ledger model: `CherryPointLedger.status` default `PENDING` in schema; anomaly flags stored separately; linked to `sessionId`, `cardId`, `merchantObservationId`.

- Vine ingest (`app/api/vine/order/route.ts`):
  - Auth via `withUser`; reads request body once.
  - Accepts either terminal-event form (`lib/schemas/vine-terminal.ts`) or `OrderContext` form (`lib/schemas/vine.ts`); MCC optional but validated by `isValidMcc` when present.
  - Rejects stale payloads older than ~3 minutes (`ageMs > maxAgeMs`).
  - Maps to `OrderContext` (`lib/vine/order-context.ts`), runs engine via `runRecommendationFromOrderContext` → creates `RecommendationSession` with `source` set to `VINE_SIM` or `VINE_DEVICE`, `orderToken` from nonce or UUID, expiry ~15 minutes.
  - Returns `{ sessionId, decision, orderToken }`. HMAC/nonce auth is TODO.

- Wallet Pass (`app/api/wallet/cherry-pass/route.ts`):
  - Auth via `withUser`. Uses `getWalletPassConfigStatus` (`lib/wallet/config.ts`): requires `CHERRY_WALLET_PASS_ENABLED=true` and Apple Wallet env vars (team ID, pass type ID, org name, description, cert password/path, WWDR path).
  - If misconfigured/disabled: returns `501` JSON `{ error: "wallet_pass_not_configured", reason, message }`.
  - When configured: generates `storeCard` pass via `generateCherryPass` (`lib/wallet/cherryPass.ts`); placeholders for points; never a payment pass.

- Auth stack:
  - NextAuth (PrismaAdapter) with Email, Google, and dev Credentials (non-prod) in `app/api/auth/[...nextauth]/route.ts`.
  - `withUser` (`lib/with-user.ts`) pulls `getServerSession` userId; returns 401 otherwise.

- Tests:
  - Engine invariants, wallet-pass config, bucket periods, vine order mapping, and client API smoke tests in `tests/*.test.js`; all passing as of this audit.

## 2. Gaps vs Vision / Legal Constraints
- Reversal implemented only for single-bucket sessions using `confirmedAmountCents` and `bucketSpendReversed`; multi-bucket or partial verification flows are not supported.
- Verification automation is stubbed (`lib/verification/verify-session.ts`); no real signals or auto-posting.
- Vine security is minimal: no HMAC/nonce validation or device registry; freshness only. Needs future hardening to avoid spoofed context (legal constraint: context-only, but spoofing could degrade trust).
- Legacy/duplicate engine logic in `lib/simulation.ts` (separate category resolver, bucket/currentAmount usage) risks drift from canonical engine; not used by core flow but could confuse contributors.
- `currentAmount` field remains legacy; docs and engine ignore it post-create, which can cause misunderstanding.
- `CategoryPreference.category` is a string, not enum-validated; intentional/unbudgeted coverage relies on string accuracy.
- Wallet pass generation still reads certs when fully enabled; acceptable, but ensure feature flag stays off by default to avoid accidental filesystem access. Currently compliant.

## 3. Risks and Impact (Ranked)
- High — Verification stub (signals) and limited reversal semantics:
  - Impact: reversal only covers the confirmed bucket/amount; no automation from external signals. Evidence: `app/api/sessions/[id]/confirm/route.ts` sets `confirmedAmountCents`; `app/api/sessions/[id]/verify/route.ts` reverses when `verified=false` using `bucketSpendReversed`.
- Medium — Vine lacks HMAC/nonce/device auth:
  - Impact: spoofed Vine events could create sessions with misleading recommendations. Evidence: `app/api/vine/order/route.ts` TODO comment section, no auth beyond freshness.
- Medium — Legacy simulation engine drift:
  - Impact: future contributors might reuse `lib/simulation.ts` and diverge from canonical engine (rollover/incentive rules). Evidence: separate `resolveCategory`/card logic in `lib/simulation.ts` not used by main APIs.
- Low — `currentAmount` legacy field and CategoryPreference string:
  - Impact: confusion about balance source of truth and potential typos for unbudgeted mode. Evidence: schema `Bucket.currentAmount`, `CategoryPreference.category String` in `prisma/schema.prisma`; engine ignores `currentAmount`.

## 4. Concrete Fixes / Migrations
- Bucket spend reversal policy:
  - Implemented: `confirmedAmountCents` persists the applied spend; `verify(verified=false)` reverses once using `bucketSpendReversed` and `ensureBucketFresh`. Future: consider multi-bucket or partial verification semantics if ever supported.
- Verification automation:
  - Implement signals in `lib/verification/verify-session.ts` (bank/receipt/Vine) and trigger `/api/sessions/[id]/verify` with `verified: true/false` based on evidence. Add tests covering state transitions and anomalies.
- Vine hardening:
  - Add HMAC/nonce verification and device registry table; validate signatures in `app/api/vine/order/route.ts` before running the engine. Update `docs/cherry-vine.md` and `docs/api.md` with signature format and failure modes.
  - Add cleanup (cron/script) to mark expired Vine-created `RecommendationSession` rows as `EXPIRED` and invalidate tokens.
- Engine/Simulation consolidation:
  - Mark `lib/simulation.ts` as legacy in its header or refactor callers to use `runEngine`; ensure any remaining uses either import the canonical engine or are archived.
- Schema hygiene:
  - Optionally migrate `CategoryPreference.category` to `RewardCategory` enum to prevent typos; add validation on write paths.
  - Consider deprecating `Bucket.currentAmount` or documenting it as legacy-only; ensure UI does not surface it as live balance.

## 5. Short-Term Plan (Implementation Checklist)
1) Bucket verification alignment:
   - DONE: rollback logic implemented in `/api/sessions/[id]/verify`. Remaining: expand if multi-bucket sessions are introduced.
   - Add more tests if bucket selection changes (strict-first, multi-bucket).
2) Verification automation:
   - Flesh out `lib/verification/verify-session.ts` to call `/api/sessions/[id]/verify` based on mock/fixture signals; add tests for posted/revoked ledger transitions and anomaly propagation.
3) Vine security hardening:
   - Implement HMAC/nonce validation with device registry; reject unsigned/stale payloads before engine call.
   - Add cleanup job/script for expired Vine sessions/tokens.
4) Simulation engine drift:
   - Add a header comment or README note marking `lib/simulation.ts` as legacy; route new logic through `runEngine` where feasible.
5) Schema/input hygiene:
   - Migrate `CategoryPreference.category` to enum and add write-time validation.
   - Clarify `currentAmount` as legacy in bucket docs/UI or remove from UI surfaces.

## 6. Long-Term Plan (Anchored to Vision)
- Advisory accuracy & legal guardrails:
  - Keep Cherry strictly advisory (Observe → Evaluate → Recommend → Reward) and outside payment rails (`docs/legal-constraints.md`). Enhance verification with non-payment signals (bank data, receipts, Vine context) to move ledger from PENDING → POSTED automatically.
- Vine production readiness:
  - Define and enforce signature scheme, device provisioning, and token freshness; add merchant portal/device registry while keeping Vine context-only (no card data, no EMV/ISO).
- Wallet Pass go-live:
  - Keep `CHERRY_WALLET_PASS_ENABLED` off by default; when certs are ready, enable storeCard pass generation with deep link to advisory flows. Ensure messaging avoids any “pay with Cherry” framing.
- Engine & bucket robustness:
  - Expand tests around rollover gaps, multi-bucket selection rules, and incentives; consider configurable bucket selection (strict-first) while keeping `spentCents` as source of truth.
- Data model tightening:
  - Normalize category preferences and legacy fields; add indices for common ledger queries (`userId + status`) if performance requires.
