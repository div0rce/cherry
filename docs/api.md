# Cherry API Reference (App Router)

Status: **Active**. This file documents the server routes under `app/api/*` and how they align with the product contract:
- Cherry is an advisory copilot (not a card/terminal).
- `/api/scan` is stateless advisory.
- Sessions + ledger handle persistence and rewards.
- Vine is context-only ingestion.
- Wallet pass is scaffolded and returns 501 until certs exist.

Authenticate all protected endpoints with cookies from `./scripts/dev-login.sh` (`-b cookies.txt`).

---

## Core Advisory API — `POST /api/scan` (stateless)
Route: `app/api/scan/route.ts`

Purpose: pre-swipe advisory for manual scans, Cherry Pass/App Clip triggers, or quick bucket snapshots. **No DB writes.**

Request:
```json
{
  "merchantName": "Chipotle",
  "category": "DINING",           // optional RewardCategory
  "expectedAmountCents": 2000     // optional integer >= 0; 0 = bucket snapshot
}
```
- `merchantName`: required string.
- `category`: optional; if absent, engine infers (MCC → history → OTHER).
- `expectedAmountCents`: optional non-negative integer. **Current route rejects <= 0 with 400**; target behavior (per spec) is to allow `0` for bucket snapshots.

Response (conceptual):
```json
{
  "merchantName": "Chipotle",
  "category": "DINING",
  "amountCents": 2000,
  "bucket": {
    "name": "Dining Weekly",
    "limitCents": 20000,
    "spentBeforeCents": 15000,
    "spentAfterCents": 17000,
    "remainingAfterCents": 3000,
    "strictMode": true,
    "wouldExceed": false,
    "coverageMode": "BUDGETED",
    "verdict": "BORDERLINE"
  },
  "cardRecommendation": {
    "cardId": "card_123",
    "cardNickname": "Amex Gold",
    "rewardMultiplier": 4,
    "estimatedRewards": 200,
    "verdict": "OPTIMAL"
  },
  "budgetVerdict": "BORDERLINE",
  "cardVerdict": "OPTIMAL",
  "overallVerdict": "YELLOW",
  "cherryIncentive": {
    "pointsIfFollowed": 15,
    "expiryMinutes": 15
  },
  "engineDecision": { "...": "raw decision for debug surfaces" }
}
```
Behavior:
- Validates JSON with `lib/schemas/scan.ts` and `parseJsonBody`.
- Infers category using MCC map when available, falls back to merchant heuristics/history.
- Uses `lib/engine.ts` to compute verdicts and incentives; throws if invariants fail.
- Does **not** create sessions, ledger rows, or modify buckets.

Example:
```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"merchantName":"Chipotle","category":"DINING","expectedAmountCents":2500}' | jq
```

---

## Session + Reward Lifecycle
Routes: `app/api/sessions/route.ts`, `app/api/sessions/[id]/confirm/route.ts`, `app/api/sessions/[id]/verify/route.ts`

Purpose: persist a recommendation (manual scan or Vine), let the user claim they followed advice, and move Cherry Points between PENDING/POSTED/REVOKED.

### `POST /api/sessions`
Body:
```json
{
  "merchantName": "Chipotle",
  "amountCents": 2200,
  "category": "DINING",    // optional
  "currency": "USD",       // optional, default USD
  "deviceId": "VINE-SIM-1", "storeId": "STORE-1", "terminalId": "TERM-1", "orderId": "ORDER-123", "mccCode": 5812 // all optional
}
```
Behavior:
- Validates via `lib/schemas/sessions.ts`.
- Calls `lib/engine.ts` for decision; stores `RecommendationSession` with verdicts, coverageMode, offered points, and expiry (~15 minutes).
- Returns `{ sessionId, decision }`.

### `POST /api/sessions/[id]/confirm`
Body:
```json
{
  "actualAmountCents": 2200,    // optional; defaults to recommended
  "usedCardId": "card_abc",     // optional
  "followedRecommendation": true
}
```
Behavior:
- Loads session, rejects expired/claimed/verified/rejected.
- Flags anomalies (amount mismatch, time window, card mismatch) and writes `CherryPointLedger` rows with `PENDING` status.
- Returns session + ledger status and pending points.

### `POST /api/sessions/[id]/verify`
Body:
```json
{ "verified": true }
```
Behavior:
- Simulated verification: flips session status to VERIFIED/REJECTED and ledger entries to POSTED/REVOKED, carries anomaly flags through.

---

## Vine Order Ingestion (dev-only today)
Route: `app/api/vine/order/route.ts`

Purpose: ingest order context from the Vine simulator or future hardware, run the engine, and create a bound `RecommendationSession`.

Accepted payloads:
1) **Terminal event form** (`lib/schemas/vine-terminal.ts`):
```json
{
  "amount": 2450,
  "currency": "USD",
  "mcc": "5812",
  "merchant": { "merchantName": "Cherry Coffee", "storeId": "STORE-1" },
  "terminal": { "terminalId": "TERM-1" },
  "vine": { "source": "VINE_SIM", "sessionId": "optional" }
}
```
2) **OrderContext form** (`lib/schemas/vine.ts`):
```json
{
  "deviceId": "VINE-SIM-1",
  "amountCents": 2450,
  "currency": "USD",
  "merchantName": "Cherry Coffee",
  "mccCode": 5812,
  "timestamp": 1732765200000,
  "source": "VINE_SIM",
  "storeId": "STORE-1",
  "terminalId": "TERM-1",
  "orderId": "ORDER-123",
  "nonce": "optional"
}
```

Behavior:
- Validates JSON; maps terminal events to `OrderContext`.
- Uses `runRecommendationFromOrderContext` to call the engine and persist a `RecommendationSession` with an `orderToken` and expiry (~15 minutes).
- Returns `{ sessionId, decision, orderToken }`.
- Dev-only: exercised via `/vine-simulator`.

---

## Wallet Pass Scaffold
Route: `app/api/wallet/cherry-pass/route.ts`

Status: **SCAFFOLDED**. Returns `501 Not Implemented` until Apple Wallet certs/env vars are provided. See `docs/wallet-pass.md`. Never attempt to make this a payment card; it is a `storeCard`-style loyalty pass.

---

## Cards, Buckets, Simulation
- `/api/cards` — CRUD for cards/reward rules (auth required).
- `/api/buckets` — CRUD for buckets (auth required); period windows computed on create.
- `/api/simulate` — Runs engine and records a `SimulatedTransaction` for sandbox history; may update bucket spend according to strict-mode logic.
- `/api/mccs` — Read MCC mapping (used by engine for category resolution).

All routes validate with `lib/validation/*` and guard with `withUser`.

---

## Admin/Dev Endpoints (local only)
- `/api/admin/clear-user` — clear user data (cards/buckets/etc).
- `/api/admin/clear-sessions` — clear `RecommendationSession` rows.
- `/api/admin/clear-ledger` — clear `CherryPointLedger` rows.
- `/api/admin/health` and `/api/health` — simple health checks.
- `/api/seed-demo` — seed demo data (cards, buckets, sessions, ledger).

---

## Notes and Invariants
- Never persist data in `/api/scan`; persistence belongs in sessions/ledger.
- Do not store card PAN/CVV/track data; Vine payloads are context-only.
- Monetary values are integer cents in APIs and DB.
- Handle `401` by prompting sign-in (UI) or adding cookies (CLI).
- Wallet pass remains gated at 501 until Apple certs/env vars are provided.
