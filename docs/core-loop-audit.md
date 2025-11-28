# Cherry Core Loop & Engine / Vine / Wallet Pass Audit

_Last updated: 2025-11-28_

## High-Level Findings

- Core loop pieces exist (engine, `RecommendationSession` + `CherryPointLedger`, manual UI, Vine simulator), but `/api/scan` drifts from the spec (requires amount > 0, weak category inference, unused in UI).
- Bucket math is inconsistent: engine reads `spentCents`/`budgetAmount`, but nothing updates `spentCents`; `currentAmount` is maintained only on create → budget health is likely stale.
- Duplicate engines/resolvers (`lib/engine.ts` vs `lib/simulation.ts`) risk drift; no tests cover invariants.
- `/api/vine/order` double-reads the request body, so non-terminal payloads fail; it also hard-requires MCC and lacks HMAC/expiry enforcement beyond DB expiry.
- Recommendation confirmation/verify + ledger wiring exists, but verification orchestrator stubs are unused; ledger default status is `POSTED` while confirm writes `PENDING`.
- Wallet pass route attempts real pass generation if env/certs are present; the doc expects an explicit `501` stub until certs exist.
- Category inference ignores the MCC map in `/api/scan`, relying only on last simulated txn.
- `npm run lint` / `npm run typecheck` / tests were **not** run in this audit pass.

---

## 1. Mapping Cherry’s Core Loop (Task A)

| Stage                                | Current implementation (files)                                                                                                                                                                                    | Gaps vs vision                                                                                                                                                          | Risk   | Suggested fix/extension                                                                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observe — advisory `/api/scan`       | `app/api/scan/route.ts` parses `ScanRequestSchema`, infers category from last `SimulatedTransaction`, requires `expectedAmountCents > 0`, calls `runEngine`, returns decision only                                | Spec allows `expectedAmountCents = 0` for bucket snapshot; no MCC inference; rejects 0; not used by UI; no debug flag                                                  | Medium | Adjust schema to allow `>= 0`, remove 400 guard, let `runEngine` handle snapshots; feed MCC map/historical inference; surface optional debug block                                                       |
| Observe — Manual Lookup UI / sessions | `app/scan/ScanClient.tsx` → `/api/sessions` `POST`, `/api/sessions/[id]/confirm`; creates `RecommendationSession`/ledger `PENDING`                                                                              | Bypasses `/api/scan`; no MCC support; bucket math stale; no GET/list API for single session; no expiry cleanup job                                                     | Medium | Decide contract: keep `/api/scan` stateless, `/api/sessions` for persistence; add MCC field; add expiry cleanup + GET by id; fix bucket math                                                             |
| Observe — Vine simulator             | `app/api/vine/order/route.ts`, `lib/vine/order-context.ts`, `lib/vine/run-recommendation.ts`, UI `app/vine-simulator/*`                                                                                          | Request body is consumed twice (terminal vs fallback) → `OrderContext` path fails; MCC hard-required; no HMAC/token expiry enforcement; no order cleanup               | High   | Read body once and branch in-memory; allow MCC optional + fallback inference; add `expiresAt`/cleanup job; TODO HMAC/nonce validation                                                                     |
| Evaluate                             | `lib/engine.ts` (uses `spentCents`, MCC map, incentives), `lib/engine-invariants.ts`; legacy `lib/simulation.ts`                                                                                                | Bucket fields not maintained; no period rollover; duplicate engine/resolver; no tests; `runEngine` forbids amount 0 (blocks snapshots)                                | High   | Pick single engine; support amount 0 snapshots; add unit tests for invariants; update bucket persistence or compute spend consistently                                                                    |
| Recommend                            | Decisions returned in `/api/scan`, `/api/sessions`, `/api/vine/order`; UI surfaces in `/app/scan` and `/app/vine-simulator`                                                                                     | `/api/scan` not powering UI; no countdown/expiry surfacing; no delivery channel abstraction (pass/App Clip)                                                            | Medium | Align `/api/scan` response shape to spec and reuse in UI; expose expiry and token where relevant                                                                                                          |
| Reward                               | `/api/sessions/[id]/confirm` creates ledger `PENDING`; `/api/sessions/[id]/verify` posts/revokes; `lib/points.ts` reads posted balance                                                                          | Auto-verification stubs unused; ledger default `POSTED` may hide missing status; no streaks; no anomaly audit                                                          | Medium | Trigger `autoVerifySession` hook; set ledger default to `PENDING` or ensure all writes set status; add audit script/tests                                                                                 |
| Observe/Recommend — Wallet pass stub | `app/api/wallet/cherry-pass/route.ts`, `lib/wallet/cherryPass.ts` attempts real pkpass if env/certs present; returns 501 on error                                                                               | Should be explicit `501` stub until certs exist; no feature flag; env missing leads to runtime FS read attempt                                                         | Low    | Gate early with config check, return 501 with reason; add doc link to `docs/wallet-pass.md`; keep generation path behind explicit flag                                                                    |

### What the dev should do next (Core Loop):

1. Decide stateless `/api/scan` behavior (allow 0, MCC inference) and re-align UI/docs.
2. Fix `/api/vine/order` body handling bug and loosen MCC requirement with fallback inference.
3. Choose bucket accounting model and update engine + persistence accordingly.
4. Deduplicate engine vs simulation resolver; add tests around invariants.
5. Add early 501 gate to wallet pass route to match intentional stub.

---

## 2. Data Model and Engine Audit (Task B)

### 2.1. Buckets

- Fields:
  - `budgetAmount`, `currentAmount`, `spentCents`, `periodStart`, `periodEnd`, `strictMode`, `category`.
- Current behavior:
  - Engine uses `spentCents` for calculations.
  - Nothing updates `spentCents`.
  - `currentAmount` is updated only on create.
  - No rollover logic → budget verdicts drift as time passes.
- Required direction:
  - Pick a canonical field (prefer `spentCents`) and:
    - Update it consistently when **real** spend is confirmed.
    - Establish clear rollover semantics at period boundaries.

### 2.2. Card / RewardRule

- Fields:
  - Multipliers/cashback fields exist.
- Engine:
  - Only uses multiplier.
  - Only supports:
    - Category-specific multipliers.
    - Fallback “general” / `OTHER`.
- Gap:
  - Caps/promo dates unused.
- Conclusion:
  - Acceptable for v1; enforce caps/promos only when actually needed.

### 2.3. Simulation / SimulatedTransaction

- Role:
  - Sandbox runs.
  - Also feed category inference in `/api/scan`.
- Risk:
  - Mixing “simulated” history with “real” outcomes can corrupt future inference.
- Direction:
  - Explicitly separate:
    - Simulation history.
    - Real, verified sessions/transactions.
  - Ensure inference uses the correct source table(s).

### 2.4. RecommendationSession

- Already stores:
  - `category`, `amountCents`, `deviceId`/`storeId`/`terminalId`/`orderId`, `orderToken`, `verdict`, `coverageMode`, `pointsOffered`, `expiresAt`.
- Gaps:
  - `source` enum missing.
  - `orderToken` nullable.
  - No expiry cleanup job.
- Creation:
  - Done by `/api/sessions` and `/api/vine/order`.

### 2.5. CherryPointLedger

- Default:
  - `status` default `POSTED`.
- Flow:
  - Confirm writes `PENDING`.
  - Verify moves to `POSTED` / `REVOKED`.
- Problems:
  - Default `POSTED` can hide paths where status never set explicitly.
  - No balance cache.
  - No expiry.
  - Minimal anomaly flags.
- Direction:
  - Default should be `PENDING`.
  - Add:
    - Partial index on `(userId, status)` for balance queries.
    - Helper (or view) for “posted balance”.

### 2.6. CategoryPreference

- Current:
  - `category` is `String` (not `RewardCategory` enum).
- Usage:
  - Used to mark `UNBUDGETED_INTENTIONAL`.
- Risk:
  - Typos → inconsistent behavior.
- Direction:
  - Migrate to `RewardCategory` enum.
  - Add validation on write.

### 2.7. MerchantCategory / MccToRewardCategory

- State:
  - Rich MCC mapping exists.
- Engine:
  - Uses MCC mapping **when MCC is provided**.
- `/api/scan`:
  - Never passes MCC.
- Direction:
  - Wire MCC usage into `/api/scan` when MCC is available, or when merchant→MCC inference becomes possible.

### 2.8. MerchantObservation / BankTransaction

- Present but unused in current flow.
- Future:
  - Intended for verification and reconciliation.
  - Safe to leave as placeholders for now.

### 2.9. Engine

- Implementation:
  - `runEngine` in `lib/engine.ts`.
- Current behavior:
  - Forbids amount 0 → blocks bucket snapshot spec.
  - Uses `spentCents`.
  - No rollover.
  - Incentives awarded even if card data absent:
    - Invariants try to guard incentives when `NO_CARD_DATA`, but needs tests.

---

### 2.10. Prioritized Migrations

1. **`20250213_normalize_bucket_balances`**

   - Decision:
     - Make `spentCents` the source of truth.
   - Actions:
     - Make `spentCents` required.
     - Add `lastResetAt` (and optional `periodAnchor`).
     - Backfill:
       - `spentCents = clamp(budgetAmount - currentAmount, >= 0)`.
       - `lastResetAt = periodStart`.
     - Update engine:
       - Increment `spentCents` only via session confirmation (not simulation), or compute spend from ledger/sessions.
     - Update APIs:
       - `/api/sessions/[id]/confirm` increments spend or creates ledger entries that are then used as the canonical source.
       - `/api/simulate` stops mutating buckets.

2. **`20250213_category_preference_enum`**

   - Change:
     - `CategoryPreference.category` → `RewardCategory` enum.
   - Backfill:
     - Uppercase existing strings.
     - Drop/flag invalid values.
   - Add validation on write paths.

3. **`20250213_recommendation_session_source_and_token`**

   - Add:
     - `source` enum (`VINE_SIM` | `VINE_DEVICE` | `APP_SCAN`).
     - `orderToken` non-null (app-generated UUID).
     - Index on `(orderToken, expiresAt)`.
   - Backfill:
     - `source = APP_SCAN` for existing rows.
     - `orderToken = uuid_generate_v4()` for null tokens.

4. **`20250213_ledger_defaults`**

   - Change:
     - `CherryPointLedger.status` default to `PENDING`.
   - Add:
     - Partial index on `(userId, status)` for balance queries.
     - Optional view or helper for posted-only balance.
   - Backfill:
     - Keep existing `POSTED` rows.
     - Set any non-null but unset states to `PENDING`.

5. **Optional later: `20250213_drop_simulation_bucket_mutation`**

   - If/when real transactions/sessions are separate:
     - Drop or adjust `SimulatedTransaction` fields that overlap with real histories.
     - Ensure inference reads from:
       - The correct combination of simulation + real tables.

---

### What the dev should do next (Data Model / Engine):

1. Lock bucket balance semantics and prepare the normalization migration + code changes.
2. Plan `CategoryPreference` enum migration and validation.
3. Add `source` / non-null `orderToken` to sessions with indexes; wire creation code.
4. Adjust ledger default/status handling and add a posted-balance query helper.
5. After schema edits, run:

   ```bash
   npx prisma migrate dev --name <name>
   npx prisma generate
   npm run lint
   npm run typecheck
   ```

---

## 3. Cherry Vine Readiness (Task C)

### 3.1. OrderContext

* Defined in `lib/vine/order-context.ts`.
* Includes:

  * `deviceId`
  * `storeId?`
  * `terminalId?`
  * `orderId?`
  * `amountCents`
  * `currency?`
  * `merchantName?`
  * `mccCode?`
  * `timestamp`
  * `nonce?`
  * `source` (enum-like string)

### 3.2. `/api/vine/order/route.ts` Issues

* Body handling:

  * Reads `request.json()` twice (first for terminal-style payload, then for `OrderContext`).
  * Second read fails because the request stream is consumed.
  * Result: `OrderContext` path breaks for non-terminal payloads.
* MCC requirement:

  * MCC is hard-required with `isValidMcc` guard.
  * Spec allows advisory ingestion without MCC; inference should be allowed.
* Security:

  * No explicit expiry/HMAC/token verification.
  * `orderToken` is effectively a UUID/nonce only.

### 3.3. `lib/vine/run-recommendation.ts`

* Behavior:

  * Creates `RecommendationSession` with:

    * Points, expiry, anomalies default `none`.
  * `source` not stored.
  * `orderToken` default from:

    * Provided nonce, or
    * Generated UUID.

### 3.4. UI: `app/vine-simulator/*`

* Good dev-only surface.
* Uses `vineTerminalEventSchema`.
* Confirms session via `/api/sessions/[id]/confirm`.
* Needs to display:

  * `orderToken`
  * `expiresAt`

---

### 3.5. Minimal Phase 1 Adjustments

1. **Fix body parsing**

   * Read body exactly **once**:

     * `const raw = await request.json();`
   * Try:

     * First: `vineTerminalEventSchema.parse(raw)` (terminal-style).
     * On failure: `OrderContextSchema.parse(raw)`.

2. **Make `mccCode` optional**

   * Accept missing MCC:

     * If present, validate via `isValidMcc`.
     * If missing, pass `null` into `runEngine`, letting category inference handle it.

3. **Persist `source` and `orderToken`**

   * On session creation:

     * Store `source = VINE_SIM` (for simulator) or `VINE_DEVICE` later.
     * Store `orderToken` as non-null.
   * Include in API responses:

     * `orderToken`
     * `expiresAt`

4. **Add freshness checks / TODO for signatures**

   * Check `timestamp`:

     * Reject stale events (e.g., older than N minutes).
   * Insert TODO markers for:

     * HMAC validation (nonce + device secret).
     * Proper signature schema.

5. **Cleanup job**

   * Add script or API endpoint to:

     * Mark expired `RecommendationSession` records as `EXPIRED`.
     * Invalidate associated `orderToken`s.

---

### What the dev should do next (Vine):

1. Patch `/api/vine/order/route.ts` to read request body once and allow optional MCC.
2. Store `source` and `orderToken` consistently in `RecommendationSession`; include in responses.
3. Add timestamp freshness check and TODO placeholders for HMAC/nonce verification.
4. Add a lightweight cleanup mechanism (script or API) for expired sessions/tokens.
5. Ensure `app/vine-simulator` displays `orderToken` and `expiresAt` for dev testing.

---

## 4. Short-Term Development Plan (1–2 Weeks, No Hardware) (Task D)

### Milestone 1 — Engine & Bucket Correctness

**Goal:**
Single MCC-aware engine that supports advisory snapshots and consistent bucket math.

**Inputs:**

* `lib/engine.ts`
* `lib/simulation.ts`
* Bucket schema
* MCC map

**Steps:**

1. Deduplicate category resolver:

   * Canonicalize in `lib/engine.ts`.
   * Mark `lib/simulation.ts` as legacy or remove usage paths.
2. Support amount `0` snapshots:

   * Change `ScanRequestSchema` / `CentsSchema` for scan to **non-negative**.
   * Update `runEngine` to handle amount `0` by returning bucket status without incentives.
   * Remove `400` guard in `/api/scan` for `0` amounts.
3. Decide bucket accounting:

   * Use `spentCents` as canonical or compute via ledger.
   * Implement helper for period rollovers (`periodStart`/`periodEnd`).
4. Add unit tests:

   * Category resolution (MCC, merchant heuristics).
   * Strict bucket overspend behavior.
   * 0-amount snapshot behavior.
   * Incentive invariants (no incentives when `NO_CARD_DATA`, etc.).

**Outputs:**

* `/api/scan` matches spec (supports 0-amount snapshots).
* Engine stabilized with MCC-aware category resolution.
* Tests cover key invariants.

**Acceptance:**

* `/api/scan` returns bucket snapshot for `expectedAmountCents = 0`.
* MCC inference works when MCC is supplied.
* Tests pass.

---

### Milestone 2 — Session + Reward Flow Hardening

**Goal:**
Clean separation between advisory `/api/scan` and persisted `/api/sessions`, with a reliable ledger state machine.

**Inputs:**

* Session/ledger schema.
* UI `app/scan`.
* Confirm/verify endpoints.

**Steps:**

1. Add `source` + non-null `orderToken` to `RecommendationSession`:

   * Return `expiresAt` and `orderToken` from `/api/sessions` and Vine flows.
2. Ledger status semantics:

   * Default `CherryPointLedger.status` to `PENDING` or ensure all writes set it explicitly.
   * Keep `POSTED` for verified entries only.
3. Wire `autoVerifySession`:

   * Call after confirm (even as a no-op for now).
   * Prepare hooks for future:

     * Bank data.
     * Receipt parsing.
     * Vine-assisted verification.
4. Add `GET /api/sessions/[id]`:

   * Read-only view of session state, expiry, and rewards.
   * UI (`app/scan`) should display expiry/countdown.
5. Optionally reuse `/api/scan` for preview:

   * “Preview only” advisory before persisting as a session.

**Outputs:**

* Predictable session/ledger lifecycle.
* Clear UI semantics between advisory and committed rewards.
* Hooks in place for verification.

**Acceptance:**

* Create → confirm → verify → ledger POSTED path works.
* Pending/posting status visible via `/api/sessions`.
* No duplicate or double-claim behavior.

---

### Milestone 3 — Vine Simulator Robustness

**Goal:**
Reliable order ingestion without hardware and clear security TODOs.

**Inputs:**

* `/api/vine/order`
* `lib/vine/run-recommendation.ts`
* `app/vine-simulator`

**Steps:**

1. Fix body parsing + optional MCC:

   * Read body once.
   * Branch between terminal-style payload and `OrderContext`.
2. Persist `source` and `orderToken`; return `expiresAt` and `orderToken`:

   * Display in simulator UI.
3. Add timestamp freshness check:

   * Reject stale events.
   * Log/return error with appropriate code.
4. Insert TODO for HMAC/nonce signature check:

   * Document future signature format and device registry dependence.
5. Provide curl examples in `README`:

   * Terminal-like payload.
   * Direct `OrderContext` payload.

**Outputs:**

* Stable simulator + backend ingestion.
* Clear security and expiry story (even if signatures are TODO).

**Acceptance:**

* Simulator + curl both produce sessions.
* Non-terminal payloads no longer fail due to consumed body.
* Stale requests are rejected with clear messaging.

---

### What the dev should do next (Short-Term):

1. Implement Milestone 1 schema/code changes (scan schema, engine snapshot support, bucket math decision).
2. Harden session/ledger lifecycle per Milestone 2 (`source`/token, verification hook).
3. Fix `/api/vine/order` per Milestone 3 and update simulator display.
4. Add focused unit tests for engine invariants and session claim logic.
5. Re-run:

   ```bash
   npm run lint
   npm run typecheck
   ```

after code changes.

---

## 5. Long-Term Roadmap Anchored to Vision (Task E)

| Item                                 | Layer | Description                                                                                         | Prerequisites                                          | Effort | Risk   |
| ------------------------------------ | ----- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------ | ------ |
| Engine + bucket rollover             | 1     | Stable MCC-aware engine with correct period rollovers and consistent spend accounting               | Milestone 1 bucket decision/tests                      | M      | Medium |
| Advisory `/api/scan` + UI            | 1     | Stateless scan endpoint powering manual/App flows with bucket snapshots and debug flag              | Engine snapshot support                                | S      | Low    |
| Sessions + ledger/streaks            | 1     | Full session lifecycle with posted balance, streak counters, anomaly audit script                   | Ledger default fix, verification hook                  | M      | Medium |
| Cherry Pass go-live (storeCard)      | 2     | Enable real pkpass generation once certs exist; deep link into session creation                     | Apple certs; stable session API; explicit feature flag | M      | Medium |
| App Clip / deep links                | 2     | App Clip or web deep link to pre-fill merchant/amount/location and call `/api/scan`/`/api/sessions` | Advisory endpoint solid; pass deep link schema         | M      | Medium |
| Read-only bank/receipt import        | 2     | Optional verification signals to auto-post ledger entries; strictly advisory                        | Verification pipeline hooked; consent flow             | L      | High   |
| Vine order ingestion hardened        | 3     | `/api/vine/order` with HMAC, nonce, expiry, device registry                                         | Source/orderToken + cleanup; device table              | M      | Medium |
| Device registry + merchant portal    | 3     | Manage Vine devices/stores, provision secrets, view order stats                                     | Vine ingestion hardened; auth for merchants            | L      | Medium |
| Firmware prototype (ESP32 + BLE/NFC) | 3     | Minimal device posting `/order` + BLE advert token; not touching payment rails                      | Protocol stable (OrderContext, signature scheme)       | M      | Medium |

Slip-tolerant items: bank/receipt import, App Clip, merchant portal, firmware can move after core engine/session stability without breaking vision.

---

### What the dev should do next (Roadmap):

1. Finish core Layer 1 items (engine/buckets, advisory scan, session/ledger stability).
2. Gate wallet pass behind feature flag and revisit only when certs are ready.
3. Define Vine order token/signature scheme before starting device registry or firmware work.
4. Plan verification signals (bank/receipt/Vine) after ledger flow is reliable.
