Status: Active
Last updated: 2026-04-26

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
- Auth guard: `withUser` (`lib/with-user.ts`) wraps all stateful routes; unauthenticated calls return `401`.
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
- `/api/activity` — Activity feed (sessions/ledger/simulations) with pagination/filters.
- `/api/autopilot/prereqs` — returns Autopilot onboarding prerequisites (`cards/rules/buckets` counts + warnings) and the first missing step.

All use Zod validation in `lib/schemas/*`, `parseJsonBody` from `lib/validation.ts`, and `withUser` guard where stateful.

---

## Admin/Dev Endpoints (local only)
- `/api/admin/health` — authenticated dev/admin health check for the admin surface.
- `/api/health` — public health check.
- No destructive admin HTTP mutation routes remain under `/api/admin/*`.
- `/api/seed-demo` and `/api/seed-demo/cards-buckets` — seed demo data.
- `/api/dev/pending-sessions` — list PENDING-ledger sessions for the user.
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
