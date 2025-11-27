# High-Level Assessment

* App is a Next.js 16 “Cherry Lab” that already handles auth, cards, buckets, and simulations; everything is scoped to SimulatedTransaction, so “real” and “simulated” intents are not separated.
* Observe stage is manual: user types merchant/amount/category; /api/scan infers category from prior transactions only; no location, Vine, or pass-driven context.
* Evaluate stage exists twice (lib/engine.ts and legacy lib/simulation.ts) with differing bucket math; MCC mapping is ingested but unused in the active engine.
* Recommend stage is mostly the simulate UI/history; /api/scan returns a recommendation payload but nothing stores sessions or surfaces a pre-swipe UX.
* Reward stage is absent: Cherry Points are computed ephemerally in helpers but not persisted; no verification or ledger model.
* Buckets mix “remaining” (currentAmount) with recomputed spend via aggregates, so balances can drift; simulations double as budget history, which blocks future “verified” transactions.
* Auth is wired with NextAuth + Google/Credentials; admin tools exist; /api/health is linked from UI but not implemented (404 risk).
* Buckets mix “remaining” (currentAmount) with recomputed spend via aggregates, so balances can drift; simulations double as budget history, which blocks future “verified” transactions.
* Auth is wired with NextAuth + Google/Credentials; admin tools exist; /api/health is linked from UI but not implemented (404 risk).


---

## Mapping Cherry’s Core Loop to Current Repo (Task A)

| Stage     | Current implementation (file refs)                                                                                                                                                                                                               | Gaps vs vision                                                                                                                                            | Risk   | Suggested fix/extension                                                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observe   | Manual forms on app/simulate/page.tsx posting to /api/simulate; /api/scan accepts {merchantName, expectedAmountCents?} and guesses category from last SimulatedTransaction; MCC ingestion exists (scripts/ingest-mcc.ts, app/api/mccs/route.ts). | No device/location/App Clip/Pass entry; no Vine order context; category inference ignores MCC map and location; no notion of “order session” or token.    | Medium | Add OrderContext type in lib/vine/order-context.ts; new /api/vine/order to ingest merchant+amount; reuse MCC map in inference; create pre-swipe “I’m about to pay” UI that starts a session. |
| Evaluate  | Active engine lib/engine.ts (bucket spend via aggregate on SimulatedTransaction, card selection by rules); used in /api/simulate and /api/scan. Legacy lib/simulation.ts does MCC-based category resolution and bucket debits via currentAmount. | Two engines with different math; MCC mapping unused in active path; no strict separation of real vs simulated intents; bucket periods not reset/anchored. | Medium | Consolidate to one engine that calls resolveCategory (reuse MCC map), uses a single bucket balance model, and outputs a structured decision object for sessions.                             |
| Recommend | UI shows results post-hoc in history/simulations; /api/scan returns recommendation + incentive payload but nothing stores it; no push/lock-screen/App Clip flow.                                                                                 | No recommendation session table; no expiry windows; no ties to Cherry Points; no delivery channel abstraction.                                            | Medium | Introduce RecommendationSession model and APIs to create/fetch; UI surface for “scan before pay” that renders decision + countdown; prepare hooks for Wallet/Pass/App Clip later.            |
| Reward    | computeCherryIncentive returns points inline; no DB fields for points, streaks, or verification; no outcome recording beyond simulation status.                                                                                                  | Core “Reward” loop missing; cannot reconcile what user actually did; no ledger.                                                                           | High   | Add CherryPointLedger + User.cherryPointsBalance (or computed), tie to RecommendationSession outcomes; add confirm/verify endpoints and receipt/amount capture stubs.                        |


### What the dev should do next:

* Decide on the canonical engine (lib/engine.ts) and plan consolidation with MCC/category resolution.
* Sketch OrderContext and RecommendationSession types to separate Observe/Evaluate/Recommend/Reward.
* Confirm the desired bucket balance semantics (remaining vs spent) before touching migrations.
* Add a stub /api/health or remove the admin link to avoid 404 during use.
* Plan a small “pre-swipe” UI entry that will consume the new session API.

---

## Data Model and Engine Audit (Task B)

Schema alignment notes (prisma/schema.prisma):

* User: only identity fields; no Cherry Points balance or profile flags; fine for auth, but reward loop needs a ledger and optional cached balance.
* Card/RewardRule: basic structure; lacks last4/network product type, and no enforcement of caps/promos despite fields; rules aren’t used to resolve rotating categories; fine starter.
* Bucket: budgetAmount + currentAmount (remaining) + strictMode + category; engine recomputes spend from SimulatedTransaction, ignoring currentAmount; no period anchor/reset timestamps; mixing remaining/spent risks drift.
* MerchantCategory/MccToRewardCategory: rich tagging exists and ingestion script populates it; active engine ignores it; inferCategoryForMerchant only looks at prior transactions.
* Simulation/SimulatedTransaction: used for everything (both budget math and history). There is no model for “recommendation session” vs “verified outcome”; statuses are APPROVED/DECLINED but mean “simulated result,” not actual payment outcome; no storage for offered/earned Cherry Points.
* NextAuth tables (Account, Session, VerificationToken): fine.

### Prioritized migrations (ordered):

1. **20250207_add_recommendation_sessions**: new table RecommendationSession with userId, deviceId (nullable for manual), storeId/terminalId/orderId (nullable), orderToken (string), merchantName, mccCode (int, nullable), amountCents (int), currency (default USD), category (RewardCategory), recommendedCardId, recommendedBucketId, verdict (enum: HEALTHY/BORDERLINE/BREAKS_BUDGET/DECLINED), cherryPointsOffered (int), expiresAt, status (enum: RECOMMENDED/CONFIRMED/DISMISSED/EXPIRED), createdAt, updatedAt. Backfill: none; new table.
2. **20250207_add_cherry_points_ledger**: table CherryPointLedger with userId, sessionId (fk to RecommendationSession, nullable), points (int, positive/negative), reason (string), awardedAt, expiresAt (nullable), status (enum: PENDING/POSTED/REVOKED). Optionally add User.cherryPointsBalance (int default 0) maintained by triggers/app logic. Backfill: zero balance.
3. **20250207_normalize_buckets**: add spentCents (int, default 0), periodStart/periodEnd (DateTime) to anchor windows; deprecate currentAmount or keep as computed view. Backfill: set spentCents = budgetAmount - currentAmount (clamped to ≥0); set periodStart to period start for createdAt, periodEnd to start+period. Update engine to use spentCents and roll periods forward.
4. Stretch (after above): **20250207_add_order_context_for_vine** if you want device-level auth: table with deviceId, deviceSecretHash, storeId, status, to gate /api/vine/order.

### What the dev should do next:

* Choose the bucket balance model (spent vs remaining) and lock it before migration work.
* Draft the Prisma models for RecommendationSession and CherryPointLedger with enums.
* Plan migration names and backfill scripts; run npx prisma migrate dev --name <name> and npx prisma generate.
* Update engine code sketches to consume the new models (session creation + ledger writes).
* Decide whether to add User.cherryPointsBalance or compute from ledger on read.

---

## Cherry Vine Readiness (Task C)

* Where /api/vine/order would live: create `app/api/vine/order/route.ts`. For Phase 1, protect with withUser (dev-only) and accept a JSON OrderContext.
* OrderContext type to add at `lib/vine/order-context.ts`:

```ts
export type OrderContext = {
  deviceId: string;
  storeId?: string;
  terminalId?: string;
  orderId?: string;
  amountCents: number;
  currency?: 'USD';
  merchantName?: string;
  mccCode?: number;
  timestamp: number; // epoch ms
  nonce?: string;
  source: 'VINE_SIM' | 'VINE_DEVICE' | 'APP_SCAN';
};
```

* Flow for handler: validate payload → generate orderToken (placeholder random for Phase 1) → resolve category via MCC map (resolveCategory from lib/simulation.ts) → call consolidated engine → persist RecommendationSession with decision and token → return `{orderToken, recommendation, sessionId}`. This lets a client/App Clip fetch by token later.
* Background processing: add `GET /api/vine/order/[token]` later to fetch the stored context + decision; optional expiry/cleanup job.
* Minimal Phase 1 Vine Simulator: add `app/vine-simulator/page.tsx` with a form for merchantName, amount, mcc, deviceId. It posts to /api/vine/order, shows the returned recommendation and token, and links to a “confirm outcome” action that will later write to CherryPointLedger.
* Engine plug-in: add a helper `runRecommendationFromOrderContext(orderContext, userId)` in `lib/engine.ts` (or new `lib/recommendation.ts`) that maps OrderContext → category via MCC → calls evaluateTransaction → wraps into the response shape expected by /api/vine/order.

### What the dev should do next:

* Add lib/vine/order-context.ts with the type above.
* Sketch app/api/vine/order/route.ts signature to accept OrderContext and call the engine.
* Decide token strategy (random UUID for Phase 1) and expiry window.
* Plan app/vine-simulator/page.tsx UI that posts to the new endpoint and displays the decision.
* Reuse resolveCategory in the new engine helper so MCC ingestion pays off.

---

## Short-Term Development Plan (Task D)

### Milestone 1 — Engine + Data Model Hardening (Goal: single engine, correct bucket math, MCC-aware):
Inputs: current lib/engine.ts, lib/simulation.ts, MCC map, bucket schema.

* Steps:
    1. Move resolveCategory into lib/engine.ts and use it in /api/simulate and /api/scan;
    2. pick bucket balance semantics and update engine + /api/simulate to use the new fields (spent vs remaining);
    3. delete or mark legacy lib/simulation.ts unused;
    4. add unit tests for category resolution and bucket strict decline.

* Outputs: one engine module with MCC usage; updated API handlers; passing tests.

* Acceptance: /api/simulate still works end-to-end; category inference respects MCC; bucket balances stay consistent across multiple simulations.

### Milestone 2 — Cherry Session Flow (Goal: store recommendations and outcomes):
Inputs: new Prisma models (RecommendationSession, optional CherryPointLedger), engine outputs.

* Steps:
    1. Add migrations;
    2. implement /api/sessions POST to create a session from merchant/amount with engine decision;
    3. add /api/sessions/[id]/confirm to record chosen card/outcome amount and award Cherry Points;
    4. build a minimal UI page “Scan before you pay” that calls these endpoints and shows recommended card + bucket impact + points offer.

* Outputs: session records persisted; ability to confirm and see points awarded.

* Acceptance: creating a session returns an ID/token; confirming writes a ledger row; UI shows offered/earned points and updates user balance.

### Milestone 3 — Vine Simulator (Goal: exercise the order-ingest path without hardware):
Inputs: OrderContext helper, session endpoints.

* Steps:
    1. Add /api/vine/order that maps OrderContext → session;
    2. add app/vine-simulator/page.tsx with a form to post merchant/amount/mcc/deviceId;
    3. render the returned recommendation and token;
    4. optional script scripts/vine-simulate.sh to curl the endpoint.

Outputs: manual test flow for “POS sends order → Cherry responds with recommendation.”

Acceptance: posting via UI or curl creates a session, returns a recommendation, and is visible in the DB; no auth errors; tokens expire or can be invalidated.

### What the dev should do next:

* Lock the bucket math decision, then refactor the engine to use MCC resolution.
* Draft and run the migrations for sessions/ledger before wiring APIs.
* Implement the /api/sessions + confirm endpoints and a simple “Scan before pay” page.
* Build the Vine simulator endpoint/page once sessions exist.
* Run npm run lint and npm run typecheck after each milestone.

---

## Long-Term Roadmap (Task E)

| Item                                     | Layer                            | Description                                                                                           | Prerequisites                    | Effort | Risk   |
| ---------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------- | ------ | ------ |
| Unify engine + bucket resets             | Core Engine & Experience         | Single MCC-aware engine, correct bucket period rollover, consistent spend tracking                    | Milestone 1                      | M      | Medium |
| Recommendation sessions + ledger         | Core Engine & Experience         | Store Observe/Evaluate/Recommend state and Cherry Points outcomes; user-facing “scan before pay” flow | Milestone 2                      | M      | Medium |
| Receipt/amount confirmation UX           | Core Engine & Experience         | Add receipt upload or amount confirmation to verify outcomes and award points                         | Sessions + ledger                | M      | Medium |
| Cherry Pass finish                       | Cherry Pass & Soft Integrations  | Make /api/wallet/cherry-pass functional with real certs; link to session creation when opened         | Core engine stable; Apple certs  | M      | Medium |
| App Clip / location hints                | Cherry Pass & Soft Integrations  | App Clip or deep link that pre-fills merchant/location; optional GPS-based merchant inference         | Pass flow; session API           | M      | Medium |
| Bank/receipt read-only import (optional) | Cherry Pass & Soft Integrations  | Plaid/email ingestion to auto-confirm outcomes; strictly read-only                                    | Ledger + sessions                | L/M    | High   |
| Vine order ingest backend                | Cherry Vine & Merchant Ecosystem | /api/vine/order, device identity, orderToken verification, HMAC                                       | Session API; device table        | M      | Medium |
| Merchant portal + device registry        | Cherry Vine & Merchant Ecosystem | Manage stores/devices, view aggregated stats, provision secrets                                       | Device table; auth for merchants | L      | Medium |
| Firmware prototype                       | Cherry Vine & Merchant Ecosystem | ESP32 HTTP POST /order + BLE advert emitting token/amount; manual config                              | Order ingest protocol defined    | M      | Medium |

### What the dev should do next:

* Prioritize core engine + session/ledger work before any hardware/App Clip tasks.
* Decide whether to pursue Cherry Pass configuration now or defer until engine stability.
* Write a short spec for /api/vine/order and the orderToken schema to unblock both simulator and future firmware.
* Keep reward/verification (ledger) ahead of merchant analytics to stay aligned with Observe → Evaluate → Recommend → Reward.
