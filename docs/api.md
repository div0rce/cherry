Status: Active
Last updated: 2025-12-01

# Cherry API Reference (App Router)

This file documents the server routes under `app/api/*` and how they align with Cherry’s product contract (copilot, not a card/terminal). See `docs/legal-constraints.md` for hard guardrails. Authenticate protected endpoints with cookies from `./scripts/dev-login.sh` (`-b cookies.txt`).

---

- Engine overview: versioned solver pipeline in `lib/engine` (`solveDecision`/`safeSolveDecisionForUser` with normalized state + context builders); legacy `runEngine` remains only for compatibility on older surfaces.

---

## Dev console surfaces (UI entry points)
- `/` Dashboard: consolidated metrics and shortcuts into engine, spend, and admin tools.
- `/scan`: manual advisory UI for `POST /api/scan` with session handoff to `/api/sessions`.
- `/sessions`: timeline and detail views mapped to `/api/sessions` CRUD and confirmation/verification flows.
- `/simulate` + `/simulations`: exercise `/api/simulate` and inspect simulation history.
- `/statements`: spend/statement view against `/api/activity`.
- `/vine-simulator`: UI harness for `/api/vine/order`.
- `/admin`: surface for `/api/admin/*`, seed endpoints, and `/api/health`.
- Buckets/Cards/History pages follow the same header → metrics → panels layout with standardized Empty/Loading/Error states.
- `/history` is spend history (statement/bank-derived timeline); `/activity` is engine activity (sessions/ledger/engine events) under the Engine section.

---

## Auth
- Auth stack: NextAuth (PrismaAdapter) in `app/api/auth/[...nextauth]/route.ts`.
- Auth guard: `withUser` (`lib/with-user.ts`) wraps all stateful routes; unauthenticated calls return `401`.
- Client rule: on `401`, prompt sign-in (`signIn()`); server components redirect to `/signin?callbackUrl=...`.

---

## Core Advisory API — `POST /api/scan` (stateless)
- Route: `app/api/scan/route.ts`
- Purpose: pre-swipe advisory for manual scans, Cherry Pass/App Clip triggers, or quick bucket snapshots. **No DB writes.**
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
  - Validates JSON with `lib/schemas/scan.ts` and `parseJsonBody`.
  - Resolves category via `resolveScanCategory` (MCC-aware).
  - Calls engine solver via `safeSolveDecisionForUser` (legacy fallback allowed for mapping) and `validateEngineDecision`; never persists.
- Response: bucket/card verdicts + Cherry incentive + raw `engineDecision` echo for debugging.

---

## Session + Reward Lifecycle
Routes: `app/api/sessions/route.ts`, `app/api/sessions/[id]/route.ts`, `app/api/sessions/[id]/confirm/route.ts`, `app/api/sessions/[id]/verify/route.ts`

Purpose: persist a recommendation (manual scan or Vine), let the user claim they followed advice, and move Cherry Points between `PENDING`/`POSTED`/`REVOKED`.

### `POST /api/sessions`
- Body fields: `merchantName?`, `amountCents` (int > 0), `category?`, `currency?` (default `USD`), optional `deviceId`, `storeId`, `terminalId`, `orderId`, `mccCode`.
- Behavior:
  - Validates via `lib/schemas/sessions.ts`.
  - Runs engine solver (`safeSolveDecisionForUser`) and persists `RecommendationSession` with verdicts, coverageMode, offered points, expiry (~15 minutes), `orderToken` (UUID), `source = APP_SCAN`.
  - Returns `{ sessionId, orderToken, expiresAt, source, decision }`.

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
  - Calls `runRecommendationFromOrderContext` → engine; persists `RecommendationSession` with `source` = `VINE_SIM` or `VINE_DEVICE`, `orderToken` (nonce or UUID), expiry ~15 minutes.
  - Returns `{ sessionId, decision, orderToken }`.
- Not implemented yet: HMAC/nonce verification, cleanup of expired order tokens.

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
- `/api/cards/[cardId]/rewards` — CRUD for reward rules on a card.
- `/api/buckets` — Create/list/delete buckets; sets period windows on create (weekly starts Monday).
- `/api/buckets/[bucketId]` — Delete a specific bucket.
- `/api/simulate` — Runs the same engine as `/api/scan`/`/api/sessions` (via `safeSolveDecisionForUser` in `lib/engine/solver.ts`) and records a `SimulatedTransaction` for sandbox history; does **not** mutate buckets.
- `/api/simulations` and `/api/simulations/[id]` — List/fetch simulated transactions.
- `/api/mccs` — Read MCC → RewardCategory mapping.
- `/api/activity` — Activity feed (sessions/ledger/simulations) with pagination/filters.

All use Zod validation in `lib/schemas/*` and `withUser` guard.

---

## Admin/Dev Endpoints (local only)
- `/api/admin/clear-user` — clear user data (cards/buckets/etc).
- `/api/admin/clear-sessions` — clear `RecommendationSession` rows.
- `/api/admin/clear-ledger` — clear `CherryPointLedger` rows.
- `/api/admin/health` and `/api/health` — health checks.
- `/api/seed-demo` and `/api/seed-demo/cards-buckets` — seed demo data.
- `/api/dev/pending-sessions` — list PENDING-ledger sessions for the user.

---

## Notes and Invariants
- `/api/scan` is stateless; persistence belongs in sessions/ledger.
- Monetary values are integer cents in APIs and DB.
- Do not store card PAN/CVV/track data; Vine payloads are context-only.
- Wallet pass remains gated at 501 until Apple certs/env vars are provided and the feature flag is set.
- All routes must respect the legal guardrails in `docs/legal-constraints.md`.
