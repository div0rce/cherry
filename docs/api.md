Status: Active
Last updated: 2026-10-17

# Cherry API Reference (App Router)

This file documents the server routes under `app/api/*` and how they align with Cherry’s product contract (copilot, not a card/terminal). See `docs/legal-constraints.md` for hard guardrails. Authenticate protected endpoints with cookies from `./scripts/dev-login.sh` (`-b cookies.txt`).

---

- Engine overview: versioned solver pipeline in `lib/engine` (`solveDecision`/`safeSolveDecisionForUser` with normalized state + context builders); legacy `runEngine` remains only for compatibility on older surfaces.
- Engine scoring: bounded heuristic scoring across monetary rewards, runway, and debt-pressure relief. Per-user weights come from `User.engineObjectiveProfile` (+ JSON overrides). `/api/simulate` response shape stays the same; internal ranking adapts to the user profile.

---

## Dev console surfaces (UI entry points)
- `/dev` dashboard consolidates metrics and shortcuts into engine, spend, and admin tools.
- `/scan` runs the manual advisory UI for `POST /api/scan` with session handoff to `/api/sessions` (dev-only surface).
- `/sessions` maps to `/api/sessions` CRUD and confirmation/verification flows.
- `/simulate` + `/simulations` exercise `/api/simulate` and inspect simulation history.
- `/dev/statements` uses `/api/activity` for statement rollups.
- `/vine-simulator` is the UI harness for `/api/vine/order`.
- `/admin` fronts `/api/admin/health`, seed endpoints, and `/api/health`.
- Buckets/History pages follow the same header → metrics → panels layout with standardized Empty/Loading/Error states.
- `/history` is spend history (statement/bank-derived timeline); `/activity` is engine activity (sessions/ledger/engine events) under the Engine section.

---

## Auth
- Auth stack: NextAuth (PrismaAdapter) in `app/api/auth/[...nextauth]/route.ts`.
- Auth guard: every stateful route resolves the user via `resolveUserContext` (`lib/user-context.ts`); nine routes use the `withUser` wrapper (`lib/with-user.ts`) around it. Unauthenticated calls return `401`.
- Lab-demo fallback: routes that call `resolveUserContext({ requireAuth: true, allowLabDemo: true })` serve the shared lab user (`lab+single-user@cherry.dev`, created on first use) when there is no session. `lib/user-context.ts` refuses this in production (`ServerConfig.environment === 'production'`) by throwing an `UNAUTHORIZED` `AppError` (401); whether the client sees `401` depends on the route's catch block. `withUser` passes `allowLabDemo: false` and returns plain-text `401 Unauthorized` on any auth failure. Every successful `resolveUserContext` call also upserts the caller's `User` row; "read-only" notes below ignore that.
- Client rule: on `401`, prompt sign-in (`signIn()`); server components redirect to `/signin?callbackUrl=...`.
- `GET /api/user/context` — returns `{ userId, mode }` for authenticated requests (used by server components to avoid direct config access).

## Error handling boundary
- Canonical error type: `AppError` (`lib/errors.ts`). Normalize in catch blocks with `asAppError` before logging or branching.
- Transport boundary throws: `fetchJSON` throws `AppError`; API routes either use `apiHandler` or catch + map `AppError` to responses.
- UI boundary is value-based: `fetchApiResult`/`callApi` return `ApiResult<T>`; components switch on `ok` and never inspect raw errors.

---

## Core Advisory API — `POST /api/scan` (advisory with telemetry)
- Route: `app/api/scan/route.ts`
- Purpose: pre-swipe advisory for manual scans, Cherry Pass/App Clip triggers, or quick bucket snapshots. **No sessions/ledger writes; logs a `DecisionEvent` for telemetry.**
- Request:
  ```json
  {
    "merchantName": "Chipotle",
    "category": "DINING",           // optional RewardCategory
    "expectedAmountCents": 2000,    // optional integer >= 0; 0 gives bucket snapshot
    "mccCode": 5812                 // optional MCC
  }
  ```
  - `merchantName`: required string.
  - `expectedAmountCents`: optional non-negative integer; defaults to `0` if omitted/invalid.
  - `category` and `mccCode`: optional. Category resolution prefers explicit → MCC map → merchant heuristics/history.
- Behavior:
  - Validates JSON with `lib/schemas/scan.ts` and `parseJsonBody` (`lib/validation.ts`).
  - Resolves category via `resolveScanCategory` (MCC-aware).
  - Calls engine solver via `safeSolveDecisionForUser` (legacy fallback allowed for mapping) and `validateEngineDecision`; logs a `DecisionEvent` row per request (no session/bucket/ledger writes).
- Response: bucket/card verdicts + Cherry incentive + raw `decision` echo for debugging + top-level runtime truth metadata:
  - `capabilities`: which financial primitives were actually available to the runtime engine state
  - `degraded`: which reasoning dimensions are degraded because those primitives were unavailable
  - `authority` (authority_v1: verdict, severity, reasons[], counterfactuals[], explanation, inputsVersion)

---

## Session + Reward Lifecycle
Routes: `app/api/sessions/route.ts`, `app/api/sessions/[id]/route.ts`, `app/api/sessions/[id]/confirm/route.ts`, `app/api/sessions/[id]/verify/route.ts`

Purpose: persist a recommendation (manual scan or Vine), let the user claim they followed advice, and move Cherry Points between `PENDING`/`POSTED`/`REVOKED`.

### `POST /api/sessions`
- Body fields: `merchantName?`, `amountCents` (int > 0), `category?`, `currency?` (default `USD`), optional `deviceId`, `storeId`, `terminalId`, `orderId`, `mccCode`.
- Behavior:
  - Validates via `lib/schemas/sessions.ts`.
  - Runs engine solver (`safeSolveDecisionForUser`) and persists `RecommendationSession` with verdicts, coverageMode, offered points, expiry (~15 minutes), `orderToken` (UUID), `source = APP_SCAN`.
  - Returns `{ sessionId, orderToken, expiresAt, source, decision, capabilities, degraded }`.

### `GET /api/sessions`
- Query params: `limit` (<=100), `offset`, `status` (`all|active|expired|confirmed`), `verdict` (comma list), `from`, `to`, `source`.
- Returns paginated summaries via `fetchSessionSummaries`.

### `GET /api/sessions/[id]`
- Returns a single session with verdicts, coverageMode, expiry, anomalyCode, and computed `pointsPosted`/`pointsPending`. Marks `isExpired` based on `expiresAt`.

### `POST /api/sessions/[id]/confirm`
- Body:
  ```json
  {
    "actualAmountCents": 2200,    // optional positive int; defaults to recommended amount
    "usedCardId": "card_abc",     // optional override
    "followedRecommendation": true
  }
  ```
- Behavior:
  - Rejects missing/unauthorized/expired/claimed/verified/rejected sessions.
  - Flags anomalies:
    - amount mismatch (<85% or >115% of recommended),
    - time window violation (>24h since creation),
    - card mismatch when a different card is claimed.
  - Freshens the recommended bucket via `ensureBucketFresh` and increments `spentCents` once per session.
  - Creates `CherryPointLedger` row(s) with `PENDING` status; anomaly codes propagate to ledger.
  - Calls `autoVerifySession` (stub today).
  - Response: sessionStatus `CLAIMED`, ledgerStatus `PENDING`, pending points, message.

### `POST /api/sessions/[id]/verify`
- Body: `{ "verified": true | false }`.
- Behavior:
  - Finalizes session to `VERIFIED`/`REJECTED`; updates `verificationStatus`, `verifiedAt`/`rejectedAt`.
  - Moves pending ledger rows to `POSTED` (when verified) or `REVOKED` (when rejected); anomaly codes mirror session.
  - Response: `{ ok: true, sessionStatus, ledgerStatus }`.

---

## Autopilot
Routes: `app/api/autopilot/preview/route.ts`, `app/api/autopilot/commit/route.ts`; service `lib/autopilot/service.ts`.

Purpose: advisory card choice for a described purchase (preview), then a record that the user followed it (commit). Neither route touches payment rails. Prerequisites: `/api/autopilot/prereqs` (see Cards, Buckets, Simulation, MCCs).

### `POST /api/autopilot/preview`
- Auth: `resolveUserContext({ requireAuth: true, allowLabDemo: true })` (lab-demo fallback outside production; see Auth).
- Gates: none.
- Body (`AutopilotPreviewInputSchema` in `lib/validation/autopilot/preview.ts`, strict): `merchant` (non-empty string), `amountCents` (positive int), `category` (required; one of `AUTOPILOT_REWARD_CATEGORIES` in `lib/autopilot/types.ts`), `occurredAt?` (ISO 8601 datetime string; defaults to request time).
- Behavior: `getAutopilotPreview` runs the Autopilot engine at `occurredAt` with a 1500 ms timeout, derives a deterministic `decisionId` (`edid_v1_...`) from the inputs plus a bucket/card state snapshot hash, runs `simulateSpendAuthority` (authority_v1), and validates the result against `AutopilotPreviewOutputSchema`.
- Response `200`: `{ decisionId, merchant, amountCents, occurredAt, status, recommendedCard, expectedMonetaryBenefitCents, expectedPointsDelta, bucketImpact, reasonCode, authority, ui }`.
  - `status`: `ok | blocked | fallback`; `blocked` and `fallback` still return `200`.
  - `recommendedCard`: `{ id, label, issuer, network } | null`; `bucketImpact`: `{ bucketId, name, remainingCents, spentCents } | null`.
  - `ui`: copy bundle (badge, labels, `explanation { primary, secondary[], warnings[] }`, panel copy).
- Errors (`{ error, code }`):
  - `400 INVALID_PAYLOAD` for bad JSON or schema failures (Zod issues are not returned).
  - `400` `INVALID_MERCHANT`, `INVALID_AMOUNT`, `INVALID_OCCURRED_AT`, `INVALID_IDEMPOTENCY`.
  - `401 UNAUTHORIZED`; `503 ENGINE_TIMEOUT`.
  - `500` `ENGINE_ERROR`, `INVALID_PREVIEW_OUTPUT`, `PREVIEW_UNEXPECTED_ERROR`. An `occurredAt` later than the request time trips an invariant and returns `500 PREVIEW_UNEXPECTED_ERROR`, not `400`.
- Side effects: no session, ledger, or bucket writes. Logs a `DecisionEvent` row when authority returns `ok: true` (telemetry, as `/api/scan` does).

### `POST /api/autopilot/commit`
- Auth: `resolveUserContext({ requireAuth: true, allowLabDemo: true })` (see Auth).
- Gate: `AUTOPILOT_COMMIT_V2=true` selects the v2 path; any other value uses v1. Read once at module load, so changing it needs a restart. The flag never disables the route.
- Body (`AutopilotCommitInputSchema` in `lib/autopilot/types.ts`, strict): `decisionId`, `merchant`, `amountCents` (positive int), `cardId` (non-empty strings), `occurredAt` (required ISO 8601 datetime), `category?` (defaults to `OTHER`), `userNote?` (string, max 500; accepted but not used).
- Behavior: re-runs the preview evaluation (no timeout) and requires the recomputed `decisionId` to equal the submitted one, `status` to be `ok`, and `cardId` to equal the recommended card. To match, resend the preview's `merchant`, `amountCents`, `occurredAt`, and `category`; a bucket/card state change since preview also changes the `decisionId`.
  - v1 (default): in one transaction, creates a sandbox `SimulatedTransaction` with `id = decisionId`, `status = APPROVED`, `reason = AUTOPILOT_COMMIT`. Does not change bucket `spentCents`; no session or ledger rows. Response `{ decisionId, transactionId, bucket, status }`.
  - v2: upserts a `RecommendationSession` (`source = AUTOPILOT`, keyed by `engineDecisionId`), confirms it via `confirmRecommendationSession` (session `CLAIMED`, bucket `spentCents` incremented, one `PENDING` `CherryPointLedger` row, zero points allowed), then creates an `AutopilotCommit` row. Response `{ decisionId, sessionId, bucket, status }`.
- Response `200`: `status` is `created` or `already_exists`. Repeating a commit for the same `decisionId` is idempotent (v1 by `SimulatedTransaction.id`, v2 by `AutopilotCommit (userId, decisionId)`). `bucket` is the recommended bucket as `BucketRuntime`, or `null`; in v1 it is the pre-commit state.
- Errors:
  - Invalid body: `parseJsonBody` `400` (`{ error: "Invalid JSON body" }` or `{ error: "Validation failed", issues }`).
  - Service errors as `{ error, code }`: `400` `DECISION_MISMATCH`, `DECISION_BLOCKED`, `CARD_MISMATCH`, plus the preview evaluation `400`s and `500 ENGINE_ERROR`. v2 adds `COMMIT_INVARIANT_VIOLATION` (status taken from the session-confirm error, e.g. `400` when already claimed, `404` when the session or bucket is missing) and `500 MISSING_ENGINE_DECISION_ID`.
  - `401 UNAUTHORIZED`; anything else `500 AUTOPILOT_COMMIT_UNEXPECTED`.
- Side effects: as listed for v1/v2 above; both paths may also persist a bucket period rollover via `ensureBucketFresh`.

---

## Vine Order Ingestion (dev-only)
- Route: `app/api/vine/order/route.ts`
- Purpose: ingest order context from the Vine simulator or future hardware, run the engine, and create a bound `RecommendationSession`.
- Accepted payloads:
  1) **Terminal event form** (`lib/schemas/vine-terminal.ts`): amount, optional currency, merchant block (name/storeId/MCC), terminal block (terminalId), vine block (source/sessionId).
  2) **OrderContext form** (`lib/schemas/vine.ts`): `deviceId`, `amountCents` (positive int), `timestamp` (epoch ms), optional merchant/store/terminal/order IDs, optional `mccCode`, optional `nonce`, optional `source` (default `VINE_SIM`).
- Behavior:
  - Parses terminal event first; falls back to `OrderContext`.
  - Validates MCC when provided; rejects stale payloads (> ~3 minutes old).
  - Enforces Vine signature mode via the shared server config:
    - `off` and `warn` are non-production only.
    - `enforce` is required in production.
    - Invalid production config returns `500 { error, code: "VINE_SIGNATURE_MODE_INVALID" }` with `Cache-Control: no-store`.
  - Normalizes invalid signature failures at the route boundary:
    - `403 { error, code: "VINE_SIGNATURE_INVALID" }`
    - `Cache-Control: no-store`
  - Calls `runRecommendationFromOrderContext` → engine; persists `RecommendationSession` with `source` = `VINE_SIM` or `VINE_DEVICE`, `orderToken` (nonce or UUID), expiry ~15 minutes; also runs `simulateSpendAuthority` (authority_v1) and logs a `DecisionEvent` when authority returns `ok: true`.
  - Returns `{ sessionId, decision, orderToken, authority }`.
- HMAC signature verification is implemented; nonce cleanup and expired order-token cleanup are still pending.

---

## Wallet Pass Scaffold
- Route: `app/api/wallet/cherry-pass/route.ts`
- Behavior:
  - Guarded by `withUser`.
  - Gating via `getWalletPassConfigStatus`:
    - Requires `CHERRY_WALLET_PASS_ENABLED=true`.
    - Requires Apple Wallet env vars: `APPLE_WALLET_TEAM_ID`, `APPLE_WALLET_PASS_TYPE_ID`, `APPLE_WALLET_ORG_NAME`, `APPLE_WALLET_PASS_DESCRIPTION`, `APPLE_WALLET_CERT_PASSWORD`, `APPLE_WALLET_CERT_PATH`, `APPLE_WALLET_WWDR_CERT_PATH`.
  - If disabled/misconfigured: returns `501` JSON `{ error: "wallet_pass_not_configured", reason, message }`.
  - When fully configured: generates a `storeCard` `.pkpass` via `lib/wallet/cherryPass.ts`.
- Positioning: loyalty/advisory pass only; never a payment instrument (see `docs/wallet-pass.md`).

---

## Cards, Buckets, Simulation, MCCs
- `/api/cards` — CRUD for cards (auth required).
- `/api/cards/[cardId]` — update a specific card (PATCH).
- `/api/cards/[cardId]/rewards` — CRUD for reward rules on a card (includes PATCH for updates).
- `/api/buckets` — Create/list/delete buckets; sets period windows on create (weekly starts Monday).
- `/api/buckets/[bucketId]` — Update or delete a specific bucket (PATCH/DELETE).
- `/api/simulate` — Runs the same engine as `/api/scan`/`/api/sessions` (via `safeSolveDecisionForUser` in `lib/engine/solver.ts`) and records a `SimulatedTransaction` for sandbox history; does **not** mutate buckets. Live simulation is single-step and present-time: purchase projections are authorization effects, not posted settlement, and the simulator is not a generic future scheduler. Scheduled paydowns are kept as raw source data but only scheduled paydowns with `effectiveAtMs <= decisionTimeMs` mutate present preview state. Future scheduled paydowns are future-only and may surface only through `contingentRecommendation` and `futureRiskContext`. `USE_CARD_WITH_PAYDOWN` applies purchase first and immediate paydown second in the same preview step. Also runs `simulateSpendAuthority` (authority_v1), logs a `DecisionEvent` when authority returns `ok: true`, and returns an `authority` verdict/severity/reasons/counterfactuals alongside the legacy card-focused response. The solver now considers multi-action decisions (delay/reject/merchant-switch/debt paydown), but this route still returns the legacy card-focused response.
- `/api/simulations` and `/api/simulations/[id]` — List/fetch simulated transactions.
- `/api/mccs` — Read MCC → RewardCategory mapping.
- `GET /api/user/merchants` — merchant-name suggestions from the user's `BankTransaction` rows.
  - Auth: `resolveUserContext({ requireAuth: true, allowLabDemo: true })` (see Auth). Every error, including an auth failure, returns `200 { names: [] }`; the route never returns `401`.
  - Query: `query` (optional string, trimmed). It is meant as a case-insensitive `merchantName` substring filter, but the `where` clause overwrites it with `merchantName: { not: null }`, so it is currently ignored.
  - Response: `{ names: string[] }`, the distinct non-empty `merchantName` values among the user's 20 most recent rows by `postedAt` (fewer than 20 after de-duplication).
  - Side effects: read-only.
- `/api/activity` — Activity feed (sessions/ledger/simulations) with pagination/filters.
- `/api/autopilot/prereqs` — returns Autopilot onboarding prerequisites (`cards/rules/buckets` counts + warnings) and the first missing step.

All use Zod validation in `lib/schemas/*`, `parseJsonBody` from `lib/validation.ts`, and `resolveUserContext` (or `withUser`) where stateful. Autopilot preview/commit, DailyState, and dev engine routes have their own sections. `POST /api/autopilot` (`{ merchant, amount }` in dollars; no in-repo callers) is not yet documented here; see `app/api/autopilot/route.ts` and `docs/architecture/data-flow.md`.

---

## DailyState
Routes: `app/api/daily-state/route.ts`, `app/api/internal/run-daily/route.ts`, `app/api/internal/run-daily-all/route.ts`; runner `lib/daily-state/runDailyForUser.ts`. Contract: `docs/daily-state.md`.

Purpose: a per-user, per-UTC-day spend-safety summary. Advisory only; it never authorizes spend.

### `GET /api/daily-state`
- Auth: `withUser` (no lab demo; plain-text `401 Unauthorized`).
- Gates: none (not behind `CHERRY_DAILYSTATE_CRON_ENABLED`).
- Response `200`: the user's `DailyState` row with the latest `computedAt`: `{ id, userId, date, status, safeToSpendCents, nextRiskEvent, summary, computedAt, source, engineVersion, inputsVersion, errors }`.
  - `status`: `SAFE | TIGHT | RISKY | INSUFFICIENT_DATA`.
  - `summary`: `{ buckets: { remainingCents, exhaustedCategories }, pointsPending, sessionsPendingVerification }`, or null on error rows.
  - The runner sets `computedAt` to the target date's UTC midnight, so "latest" means the latest target date, not the most recent run.
- Errors: `404 { error: "not_found" }` when the user has no row.
- Side effects: read-only.

### `POST /api/internal/run-daily`
- Auth: `withUser`; runs for the signed-in user only (no `userId` field).
- Gate: `CHERRY_DAILYSTATE_CRON_ENABLED=true`, else `403 { error: "daily_state_disabled" }`. Checked after auth, so unauthenticated calls get `401` first.
- Body (inline strict Zod schema): `{ date?: string }`. A JSON body is required (send `{}`). `date` is parsed with `new Date()` and defaults to now; the run targets that date's UTC day. Dates after the current UTC day return `400 { error: "future_date" }` (a future date would roll buckets forward and zero their spend); past dates are allowed.
- Response `200`: `{ userId, date, status, inputsVersion, engineVersion }`; `date` echoes the parsed input, not the normalized UTC day.
- Errors: `400` from `parseJsonBody`; `400 { error: "invalid_date" }`; `400 { error: "future_date" }`.
- Side effects:
  - Upserts `DailyState` for `(userId, UTC day)` with `source = MANUAL`.
  - May persist bucket period rollovers (`ensureBucketFresh` at the target UTC midnight).
  - May create an `AlertEvent` row and log a placeholder alert email (`lib/alerts/sendEmailAlert.ts` only logs).
  - If computation throws, writes an `INSUFFICIENT_DATA` row with `errors` set and still returns `200`.

### `GET|POST /api/internal/run-daily-all`
- Auth: `Authorization: Bearer <CRON_SECRET>`, compared with `timingSafeEqual`; no user session. Returns `401 { error: "Unauthorized" }` when the header does not match or `CRON_SECRET` is unset or shorter than 32 characters.
- Gate: `CHERRY_DAILYSTATE_CRON_ENABLED=true`, else `403 { error: "daily_state_disabled" }` (checked after the secret).
- Body (inline strict Zod schema): `{ date?: string, batchSize?: int 1-500 }` (`batchSize` defaults to 100). `POST` requires a JSON body (send `{}`); `GET` takes no body and runs for today with the default batch size (what Vercel Cron sends). Invalid `date` returns `400 { error: "invalid_date" }`; a date after the current UTC day returns `400 { error: "future_date" }`.
- Behavior: pages through all users by `id`, `batchSize` at a time, and runs `runDailyForUser` with `source = NIGHTLY` for each, all inside this one request. Per-user failures are logged and counted, not fatal.
- Response `200`: `{ ok: true, processed, succeeded, failed, durationMs }`. The runner writes an error row instead of throwing for most computation errors, so `failed` counts only users whose fallback write also failed.
- Side effects: same as `run-daily`, for every user.
- Scheduling: nothing in the repo schedules it; `vercel.json` has no `crons` entry. A Vercel cron entry can call `GET` once `CRON_SECRET` is set.

---

## Admin/Dev Endpoints (local only)
- `/api/admin/health` — authenticated dev/admin health check for the admin surface.
- `/api/health` — public health check.
- No destructive admin HTTP mutation routes remain under `/api/admin/*`.
- `/api/seed-demo` and `/api/seed-demo/cards-buckets` — seed demo data.
- `/api/dev/pending-sessions` — list PENDING-ledger sessions for the user.
- `POST /api/dev/engine/inspect` — engine decision dump for `/dev/engine/inspector`.
  - Gate: `proxy.ts` answers `/api/dev/*` with plain-text `403` when `NODE_ENV=production`, unless `CHERRY_DEV_SHELL_ENABLED=true`.
  - Auth: `resolveUserContext({ requireAuth: true, allowLabDemo: true })` (see Auth). The catch block maps every error, including the production lab-demo refusal, to `500 { error }` rather than `401`.
  - Body (inline strict Zod schema): `merchant` (non-empty string), `amount` (positive number in dollars, rounded to cents), `category?` (string, upper-cased into the merchant category key), `mcc?` (string).
  - Behavior: builds `EngineState` with `fromPrismaUserToEngineState` and runs `safeSolveDecisionForWorld` (up to 64 candidates, no legacy decision).
  - Response `200`: `{ decisions: [{ id, actionType, cardId, score, constraintsBreached }], guardrails, topDecision }`; `guardrails` is the de-duplicated union of `constraintsBreached`. When the solver returns not-ok: `200 { decisions: [], guardrails: [], error }`.
  - Errors: `400` from `parseJsonBody`; `500 { error }` for anything thrown.
  - Side effects: read-only.
- `/api/dev/bank/ingest` — dev-only bank ingest; `POST { transactions: RawBankTransaction[] }` upserts `BankTransaction` rows idempotently (`source = "dev_simulator"`), `GET` dumps recent rows for the current user. In production, dev sources are rejected.
- `/api/dev/verification/trigger` — dev-only manual verification trigger that forwards a `VerificationSignal` into `verifySessionFromSignal` (tests ledger POSTED/REVOKED without bank simulator UI).
- Dev-only CSV ingest shortcut: `npm run dev:ingest:moustafa-bank` parses the tracked synthetic fixture at `data/bank/moustafa-adv-safebalance-2061.csv` and writes `BankTransaction` rows with `source = "csv_dev"`; blocked in production. Only synthetic financial fixtures may be committed; see `docs/data-policy.md`.

---

## Notes and Invariants
- Errors must cross boundaries only via `AppError` (API) or `ApiResult<T>` (UI); do not throw or inspect raw errors across layers.
- `/api/scan` is a hard stateless boundary; all persistence must occur via `/api/sessions` and ledger flows only.
- Engine solver traces multiple action types internally; public APIs still expose card-centric recommendations for compatibility.
- `/api/scan`, `POST /api/sessions`, and `/api/simulate` now expose top-level `capabilities` + `degraded` metadata so missing runtime primitives are machine-readable instead of silently collapsed into normal-looking advice.
- Recommendation-attempt responses from `/api/scan`, `POST /api/sessions`, and `/api/simulate` always include additive timing truth fields:
  - `temporalContext`
  - `contingentRecommendation`
  - `futureRiskContext`
- Recommendation-attempt responses include those timing truth fields on success, fallback, and no-decision responses.
- `scheduledPaydownSourceStatus` meanings:
  - `UNAVAILABLE`: the raw scheduled-paydown source could not be loaded.
  - `AVAILABLE_EMPTY`: the raw scheduled-paydown source loaded and had no rows.
  - `AVAILABLE_NO_ACTIVE`: the raw source loaded, but no future-eligible scheduled paydowns remain after engine evaluation.
  - `AVAILABLE_ACTIVE`: the raw source loaded and at least one future-eligible scheduled paydown exists.
- Mechanical coupling: `includesScheduledPaydowns = true` if and only if `scheduledPaydownSourceStatus = AVAILABLE_ACTIVE`.
- `modelMode = PRESENT_ONLY` requires `horizonEndMs = null`, `includesScheduledPaydowns = false`, `contingency = NONE`, `contingentRecommendation = null`, and `futureRiskContext = null`.
- `modelMode = PRESENT_PLUS_FUTURE_EVENTS` is allowed only for `scheduledPaydownSourceStatus = AVAILABLE_ACTIVE`.
- `horizonEndMs` is non-null only when `scheduledPaydownSourceStatus = AVAILABLE_ACTIVE`; otherwise it is null.
- `contingency = NONE` requires both contingent fields to be null.
- `contingency = REQUIRES_FUTURE_EVENTS` requires at least one contingent field to be non-null.
- `projectedLiquidCents` remains a present-only projection. Future scheduled paydowns must not be silently baked into it.
- Monetary values are integer cents in APIs and DB.
- Bank ingest must be idempotent on `(userId, externalId)` only; provider data must never supply `BankTransaction.id`.
- Do not store card PAN/CVV/track data; Vine payloads are context-only.
- Wallet pass remains gated at 501 until Apple certs/env vars are provided and the feature flag is set.
- All routes must respect the legal guardrails in `docs/legal-constraints.md`.

## Current behavior (enforced / in code)
- API handlers live under `app/api/*` and parse inputs with Zod schemas plus `parseJsonBody`.
- Engine decisions run through `safeSolveDecisionForUser` or `safeSolveDecisionForWorld` with deterministic inputs.
- `/api/scan` logs `DecisionEvent` telemetry but does not create sessions/ledger rows.
- `/api/sessions` is the persistence boundary for recommendations and Cherry Points.
- Wallet pass remains gated until certs and the feature flag exist.

## Future/Target behavior (explicitly speculative)
- Add nonce cleanup, broader device lifecycle controls, and a verified bank/receipt path that posts Cherry Points automatically.
- Document any new API surfaces in this file before shipping.

## Related docs
- `docs/routes-map.md`
- `docs/legal-constraints.md`
- `docs/cherry-vision.md`
- `docs/engine-state.md`
- `docs/vine-security.md`
- `docs/wallet-pass.md`
