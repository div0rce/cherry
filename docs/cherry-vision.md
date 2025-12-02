Status: Active and canonical
Last updated: 2025-12-02

# Cherry Vision & Product Identity

*A living document for how Cherry should exist in the world*

All other docs and code must conform to this file (and `docs/legal-constraints.md`, `docs/cherry-vine.md`, `docs/wallet-pass.md`, `docs/api.md`). If reality drifts, fix the code—not this identity. See `docs/legal-constraints.md` for hard legal guardrails.

Where this lives in the repo today:
- Advisory entry: `/api/scan` (stateless) in `app/api/scan/route.ts`.
- Persisted flow: `/api/sessions` + `/api/sessions/[id]/confirm|verify` backed by `RecommendationSession` and `CherryPointLedger` in `prisma/schema.prisma`. Bucket spend is incremented on confirm after `ensureBucketFresh` rollover.
- Engine: `lib/engine/solver.ts` (`solveDecision` + `safeSolveDecisionForUser`) with invariants in `lib/engine-invariants.ts`; legacy shim lives in `lib/engine/legacy.ts`.
- Vine context ingest (dev-only): `/api/vine/order` + simulator UI `/vine-simulator`.
- Wallet pass scaffold: `/api/wallet/cherry-pass` (501 until Apple certs).

---

## 0. TL;DR — What Cherry Is (and Is Not)

1. **Cherry is not a payment card.**
   It does not front, proxy, route, or intermediate payments. It never “sits in front” of your real cards in the authorization path.

2. **Cherry is a real-time spending advisor.**
   It lives alongside your cards, not in front of them. It gives you intelligent, contextual recommendations before you swipe, tap, or click.

3. **Cherry’s core loop is:**
   **Observe → Evaluate → Recommend → Reward.**
   It observes your context, evaluates budget + rewards impact, recommends what to do, and rewards you for following through.

4. **Cherry is your spending copilot, not your payment proxy.**
   It shapes behavior and decisions, not the underlying financial plumbing.

5. **Cherry can extend into the physical world via Cherry Vine.**
   Cherry Vine is an on-counter hardware node that only emits non-sensitive context (merchant + amount + timestamp) to nearby phones so Cherry can run its loop in real time, while still never touching payment rails.

This document defines Cherry’s identity, constraints, and core product mechanisms so we never drift into illegal “card fronting” territory, and instead build a durable, legal, and actually more powerful engine.

---

## 1. The Core Identity

### 1.1. The Single Sentence

> **Cherry is a real-time spending copilot that tells you whether you should buy, which card to use, and how that choice affects your budget and rewards — then rewards you for following its advice.**

### 1.2. What Cherry Feels Like to a User

To an end user, Cherry feels like:

* That one obsessive friend who knows:

  * every rewards program
  * your paycheck dates
  * your actual budget
  * your upcoming obligations
* …and stands next to you at the register and quietly says:

  * “Use Amex Gold here — 4x dining, you’re still $37 under budget.”
  * Or: “If you swipe this, you’re blowing your Dining bucket. Are you sure?”
  * Or: “Use your 2% card. This merchant doesn’t trigger any promos.”

The user **still pulls out their own card**. Cherry never swipes for them.
But psychologically, the card they pick feels “chosen by Cherry.”

Over time, as Cherry Vine appears on real counters, Cherry also feels like a small piece of hardware that quietly cooperates with the register to tell your phone what’s about to happen, while still leaving the actual payment entirely between you, your card, and the merchant.

---

## 2. What Cherry Explicitly Is Not

To avoid any legal/regulatory confusion, we draw hard lines.

### 2.1. Cherry is not:

* A **credit card** or **debit card**.
* A **“smart” front card** that holds multiple cards behind it.
* A **proxy BIN** that routes authorization to some underlying instrument.
* A **processor**, **gateway**, **program manager**, or **money transmitter**.
* A **custodian of funds** or an entity that “touches money.”

### 2.2. Cherry does not:

* Receive card PANs, CVV, or secure card data on its servers.
* Insert itself into the **authorization pipeline** (no fronting, no routing).
* Represent itself to a merchant as a valid payment instrument.
* Hold funds, escrow money, or delay settlement.
* Make or break the user’s ability to complete a transaction.

If the user’s card issuer declines the transaction, that’s between them and the bank.
Cherry’s job is to say: “If you do this, here’s what it means for you.”

Cherry Vine, even as a physical device in a merchant’s store, follows the same rule: it is not a reader, not a terminal, not a card. It is a context beacon that only ever sees non-sensitive order metadata and never has the ability to approve, decline, or route payments.

---

## 3. The Legal-Friendly Core Loop: Observe → Evaluate → Recommend → Reward

At a high level:

1. **Observe**: Cherry collects just enough context to know *where* you’re about to spend and for roughly *how much*.
2. **Evaluate**: Cherry’s engine runs: bucket logic, card rewards logic, budget trajectory.
3. **Recommend**: Cherry tells you which card and whether this spend is “healthy” given your goals.
4. **Reward**: Cherry gives you Cherry Points if you follow the recommendation and confirm the purchase.

Let’s break this down.

---

## 4. “Observe” — How Cherry Sees the World (Without Touching Money)

Cherry needs context without entering the payment rails.

### 4.1. Inputs Cherry can legally and safely use

These are **non-payment** signals it can rely on:

* **User-initiated scans / taps**:

  * A Wallet Pass (Cherry Pass) opened in Apple Wallet.
  * An app “Scan” button tapped when they’re at checkout.
  * An App Clip triggered via NFC/QR at a merchant.

* **User-provided merchant information**:

  * User types in merchant name (“Chipotle”).
  * User selects merchant from auto-suggest (based on location).
  * User takes a photo of a receipt → OCR extracts merchant, amount.

* **Device context (with consent)**:

  * GPS location (rough coordinates).
  * Time of day.
  * Optional: known geofenced merchant polygons.

* **User’s internal Cherry data**:

  * Buckets (categories + budgets + periods).
  * Cards and reward rules.
  * Past simulated or “verified” transactions.

* **Merchant-side Cherry Vine signals (where deployed)**:

  * A Cherry Vine hardware node broadcasting:

    * merchant identifier (e.g., chipotle_store_0241)
    * final or near-final total amount
    * timestamp and terminal identifier
  * Vine broadcasts over BLE/NFC to nearby iPhones so the Cherry app/App Clip can pre-fill context without manual typing, still without ever reading card data or touching the payment terminal’s EMV rails.

### 4.2. What “Observe” does NOT do

* Does not read card numbers.
* Does not act as POS or payment terminal.
* Does not talk to networks (Visa/Mastercard/Amex) directly.
* Does not intercept or modify the payment authorization message.
* Does not emulate a payment card or speak EMV, magstripe, or network protocols.

Cherry is basically building a **shadow model** of the transaction that’s about to happen, purely from user + context data (and, where available, merchant-provided non-sensitive signals via Cherry Vine).

### 4.3. The Cherry Vine hardware observation layer

Cherry Vine extends “Observe” into the physical merchant environment:

* Sits on or near the counter, physically close to the real POS terminal.
* Connects only to the merchant’s **order layer** (POS APIs, middleware, cloud, or printer streams), never to the **payment network layer**.
* Receives:

  * order total
  * merchant/store ID
  * optional order ID and timestamp
* Normalizes this into a compact payload and:

  * broadcasts it via BLE advertisements
  * exposes it via dynamic NFC or QR App Clip links
* Allows the Cherry app/App Clip to open already knowing:

  * “You are at this specific merchant”
  * “You are about to pay this specific amount”

Cherry Vine is thus a physical extension of Cherry’s Observe step, designed under the same constraint: maximum context, zero payment authority.

---

## 5. “Evaluate” — The Engine’s Job

This is where your existing logic lives.

### 5.1. Inputs to the engine

* `userId`
* `merchantName` (or some merchant identifier)
* `category` (RewardCategory / MCC-derived)
* `amountCents` (estimated or exact)
* Timestamp (`now`)
* User’s:

  * Buckets
  * Cards
  * Reward rules
  * Past simulation/verified transaction history
* Optional merchant metadata:

  * store/location identifiers from Cherry Vine
  * anonymized aggregate statistics for that merchant (for insights, not routing)

### 5.2. What the engine computes

For a hypothetical transaction:

1. **Bucket selection and budget impact**:

   * Which bucket does this belong to (e.g., `DINING`)?
   * What is the current period (this week / this month)?
   * How much has the user already spent in this bucket?
   * After this transaction, will they be:

     * under budget?
     * at the limit?
     * over budget?

2. **Strict-mode logic**:

   * If the bucket is in **strict mode**, should Cherry advise “do not spend”?
   * If not strict, how aggressively should Cherry warn?

3. **Card optimization**:

   * Among all user cards, which:

     * matches the category exactly (e.g., DINING 4x)?
     * or falls back to general rewards (1–2% everywhere)?
   * What is the implied reward multiplier?
   * Are there any special rules (rotating categories, caps) in the future?

4. **Reward & decision summary**:

   * Recommended card.
   * Projected rewards (e.g., 200 points).
   * Proposed “Cherry Points” for compliance.
   * A classification:

     * ✅ “Healthy swipe”
     * ⚠️ “Borderline”
     * ❌ “Budget-breaking swipe (strict)”

The engine returns a **decision object** summarizing this evaluation.

In environments with Cherry Vine, the evaluation can be triggered automatically at the right second (when the POS finalizes the total) instead of waiting for the user to type, but the decision object and its semantics remain exactly the same.

---

### 5.3. Multi-action solver (advisory only)

Cherry’s engine now evaluates multiple classes of actions for a given purchase context, still within the **advise-only** boundary:

- `USE_CARD` — recommend a specific card for the purchase.
- `USE_CARD_WITH_PAYDOWN` — recommend a card **and** schedule an extra debt payment (horizon-2).
- `DELAY_PURCHASE` — suggest deferring for a few days to protect runway.
- `REJECT_PURCHASE` — suggest skipping entirely (logged as a self-decline).
- `SWITCH_MERCHANT` — recommend an alternate merchant in the same category when data supports it.
- `PAY_DOWN_DEBT` — recommend a standalone paydown when liquidity allows.

Guardrails block unsafe actions (e.g., essential budgets over limit, paydowns that exceed liquid cash), and public APIs still surface card-centric outputs while tracing the broader decision space.

---

## 6. “Recommend” — How Cherry Talks to the User

Cherry’s recommendations should be:

* **Concrete**: “Use this specific card.”
* **Contextual**: “Here’s what this does to your budget.”
* **Actionable**: “Complete in X minutes to earn Y Cherry Points.”
* **Honest**: If it’s a bad idea financially, it should say so.

### 6.1. Example recommendation payload

Think of a canonical recommendation shape:

```json
{
  "merchantName": "Chipotle",
  "amountCents": 2000,
  "category": "DINING",
  "bucket": {
    "name": "Dining Weekly",
    "limitCents": 20000,
    "spentBeforeCents": 15000,
    "spentAfterCents": 17000,
    "remainingAfterCents": 3000,
    "strictMode": true,
    "wouldExceed": false
  },
  "cardRecommendation": {
    "cardNickname": "Amex Gold",
    "multiplier": 4,
    "estimatedRewards": 200
  },
  "cherryIncentive": {
    "pointsIfFollowed": 15,
    "expiryMinutes": 15
  },
  "verdict": "HEALTHY" // HEALTHY, BORDERLINE, BREAKS_BUDGET
}

```

### 6.2. How it’s delivered

Possible channels:

* **Push notification**: when user taps Cherry Pass in Wallet.
* **In-app banner / card**: “For this swipe, Cherry recommends…”
* **Lock screen Live Activity** (later): ongoing session while you’re in-store.
* **Wearable notification** (Apple Watch): super low friction.
* **Cherry Vine triggered App Clip**: when your phone detects a Cherry Vine broadcast (merchant + amount), the App Clip opens with the recommendation already computed.

The key: **Cherry recommends; user swipes**.
Cherry is not in the transaction chain.

---

## 7. “Reward” — The Cherry Points Loop

Cherry needs a reason for users to actually listen to it.

### 7.1. Cherry Points as a behavioral layer

* Cherry awards **Cherry Points** when:

  * You follow the recommended card.
  * You stay inside your bucket.
  * You continue to track your spending over time.
* Cherry Points are:

  * Initially: an internal, non-monetary gamification mechanism.
  * Eventually: may map to perks (discounts on premium, partner rewards, or just ego metrics like streaks, levels, ranks).

### 7.2. How compliance could be verified

Cherry cannot see the live card authorization, but it can still verify behavior via:

* **User confirmation flows**:

  * After recommendation, show “Did you complete the purchase with [Amex Gold]?” with quick Yes/No.
  * Confirm by:

    * user entering the exact amount
    * taking a photo of receipt
    * or selecting from parsed email receipts.
* **Email forwarding integration (future)**:

  * User forwards receipts to a Cherry email.
  * Cherry parses:

    * merchant name
    * amount
    * last 4 digits of card used (if visible)
    * time
  * Matches this with the recommendation window.
* **Bank data import (long-term)**:

  * Plaid / Tink / account aggregator to reconcile transactions.
  * This has its own compliance requirements, but still does not make Cherry a card.
* **Cherry Vine–assisted matching (where deployed)**:

  * Vine can attach an order ID and timestamp to the broadcast.
  * Later, when Cherry sees a receipt or bank transaction for that merchant and amount within that window, it can automatically reconcile:

    * which recommendation session this belonged to
    * whether the user’s reported card choice matches prior advice
  * Vine still never sees the card; it just improves the quality of the matching between intent and outcome.

### 7.3. Reward rules

Examples:

* +10 Cherry Points:

  * You used the recommended card and stayed within budget.
* +5:

  * You used the recommended card but overspent a bit (not strict-mode).
* 0:

  * You ignored Cherry entirely.
* Streak bonuses:

  * “7 days of following Cherry’s recommendations → +50 bonus points.”
* Location- or merchant-aware bonuses (allowed only if anonymized and consented):

  * “+5 bonus Cherry Points when you follow Cherry at a partnered merchant this week.”
  * This is implemented via aggregate logic and Cherry Vine IDs, not by leaking individual user behavior to the merchant.

---

## 8. Product Surface: The “Cherry Pass” in Apple Wallet

Instead of a “Cherry Card” that pretends to be a payment card, Cherry has a **Wallet Pass**:

* It looks like a **loyalty card** or boarding pass:

  * Cherry logo
  * Your name
  * Your current Cherry Points
  * A “Manual Lookup & Rewards” subtitle.
* When you tap it:

  * It opens the Cherry app / App Clip.
  * It can embed metadata (like a token) that identifies the user quickly.

### 8.1. Flow with Cherry Pass

1. You are about to pay at a store.
2. You open Apple Wallet, tap “Cherry Pass” (not a pay card).
3. Cherry app/App Clip opens, reads:

   * Approximate location
   * Optional merchant selection UI
   * Optional amount input or estimate
4. Cherry runs the engine.
5. Cherry shows + optionally pushes:

   * “Use X card; this is your budget status; here’s how many Cherry Points you’ll earn.”
6. You put your phone back down and use the recommended card normally.

Cherry is like a **ritual** before spending, not an instrument of payment.

### 8.2. Flow with Cherry Pass and Cherry Vine at checkout

When Cherry Vine is present at the merchant:

1. You are in line at a store that has a Cherry Vine puck next to the POS terminal.
2. The cashier rings up your order; the POS finalizes the total.
3. The POS (or its cloud/middleware) sends:

   * merchant/store ID
   * order total
   * timestamp
     to the Cherry Vine device.
4. Cherry Vine broadcasts a small payload over BLE (and optionally via NFC/App Clip link) with that context.
5. Your iPhone detects the Cherry Vine broadcast and:

   * presents a lock-screen prompt to open the Cherry App Clip or
   * wakes the Cherry Pass–linked experience with the merchant and amount pre-filled.
6. Cherry runs the engine using this pre-filled context:

   * merchant name derived from merchant/store ID
   * category resolved from merchant
   * amount from the Vine payload
   * your current buckets, cards, and rules
7. Cherry shows:

   * which card to use
   * your budget status
   * how many Cherry Points you will earn for following the recommendation.
8. You ignore Cherry Vine from that point: you physically pay on the real terminal with the recommended card.
9. Afterward, Cherry asks you to confirm what you actually did and awards Cherry Points accordingly.

Cherry Pass is the user-facing surface; Cherry Vine is the merchant-facing hardware helper that makes the ritual faster and less manual without ever becoming a payment method.

---

## 9. User Mental Model

To the user, Cherry is:

* A **companion** to their wallet, not a wallet replacement.
* A **coach** for their money decisions, not a gatekeeper.
* A **reward layer** on top of doing the “smart” thing.
* In some stores, a small puck (“Cherry Vine”) that quietly cooperates with their phone so Cherry can advise them faster, but that never replaces their card or controls the terminal.

Key phrases we want users to think:

* “I let Cherry choose my card.”
* “I check Cherry before I swipe.”
* “Cherry keeps me honest with my budgets.”
* “I get Cherry Points for following the plan.”
* “At some places, Cherry just pops up at the right second and tells me what to do.”

Not:

* “Cherry is where my money lives.”
* “I pay with Cherry.”
* “Cherry is ‘my card’.”
* “That Cherry puck is the thing I tap to pay.”

---

## 10. Positioning vs. Other Products

### 10.1. vs “Smart Cards” (Curve, etc.)

Smart cards:

* Intercept transactions.
* Route payments to different underlying cards.
* Live in the authorization path.
* Are legally complex, regulated, and fragile.

Cherry:

* Does not intercept transactions.
* Does not route payments.
* Lives entirely outside the authorization path.
* Advises + rewards behavior, with much lower risk.

Even if Cherry Vine exists on the counter, it still never acts as a smart card or proxy; it is closer to a loyalty beacon or digital receipt helper than to a payment instrument.

### 10.2. vs Budgeting apps (Mint, YNAB)

Budgeting apps:

* Are mostly **after-the-fact**.
* Show you what you did last week/month.
* Rarely influence the *moment of decision*.

Cherry:

* Is **pre-swipe** and **real-time**.
* Influences behavior **before** money moves.
* Connects budgeting + card rewards in a single UI and engine.
* Through Cherry Vine, can be physically anchored at the place where decisions actually happen, without leaving the budgeting domain.

### 10.3. vs Rewards content sites (NerdWallet, TPG)

Content sites:

* Teach you which card is good in general.
* Do not know:

  * your live budget
  * your actual cards
  * your specific situation at the register.

Cherry:

* Knows your **real** cards and their rules.
* Knows your **buckets and budgets**.
* Knows where you are **right now**.
* Gives a **single concrete recommendation** at the moment of truth.
* In Cherry Vine locations, can do this with almost zero friction, triggered by the store itself instead of by you typing.

### 10.4. vs in-store loyalty hardware and beacons

Existing in-store loyalty hardware:

* Often tries to capture identity (phone number, QR, app account).
* Sometimes links directly to offers that change what the terminal charges or how rewards are earned.
* Can be tightly bound to a specific merchant’s ecosystem.

Cherry Vine:

* Does not alter prices, promotions, or the checkout itself.
* Does not require you to identify yourself to the merchant through the hardware.
* Is merchant-installed but user-centric: its only role is to broadcast non-sensitive context so Cherry can advise the user.
* Merchant value comes from aggregate insights and better customer behavior, not from owning the user’s identity at the terminal.

---

## 11. Technical & Legal Boundaries (for devs)

When building Cherry, devs must respect these boundaries:

* **NO**:

  * Storing full PAN, CVV, track2, or chip data.
  * Acting as a payment processor, gateway, or issuer.
  * Advertising Cherry as a “card” to tap at terminals.
  * Emulating a network brand (Visa/Mastercard/Amex/Discover) on a pass.
  * Building Cherry Vine to accept card taps, read magstripe, or speak EMV protocols.
  * Wiring Cherry Vine directly into ISO8583, card schemes, acquirers, or processors.

* **YES**:

  * Storing anonymized card metadata (nickname, issuer, last 4).
  * Storing your own reward/routing logic.
  * Storing user budgets, rules, and Cherry Points.
  * Offering advice, forecasts, and recommendations.
  * Integrating with merchant POS/order systems to receive:

    * order totals
    * merchant/store IDs
    * timestamps and non-sensitive metadata
  * Using Cherry Vine as a unidirectional context emitter:

    * POS → Vine → phone, never card → Vine.

This doc should be treated as a **guardrail**:
Any feature that looks like it might cross into “proxy card” territory should be rejected at this layer.
Any Cherry Vine feature that starts to smell like a payment terminal (accepting taps, swipes, PINs, or storing cardholder data) should be rejected here as well.

---

## 12. Roadmap Implications

Because Cherry is defined as a **copilot, not a card**, the roadmap naturally centers around:

1. **Better observation**:

   * Stronger merchant inference (MCC mapping, location + merchant DB).
   * Cleaner ways to input transactions quickly (receipt OCR, simple forms).
   * Cherry Vine deployments that can broadcast merchant + amount so the app/App Clip opens pre-filled and ready to advise.

2. **Smarter evaluation**:

   * More nuanced bucket types (savings goals, debt payoff).
   * “If you keep doing this, you’ll overshoot by X by end of month.”
   * Merchant-aware heuristics that can tell you not just “can you afford it” but “is this consistent with how you said you want to use this category over time,” still computed on Cherry’s side, not at the merchant.

3. **Clearer recommendations**:

   * Simple language that builds trust.
   * Handling edge cases (“No card gives bonus here; use lowest APR”).
   * Variants of the message tailored for:

     * pure app usage
     * Cherry Pass–initiated flows
     * Cherry Vine–triggered flows, where the user has almost no time and needs one sentence plus one button.

4. **Deeper reward loops**:

   * Streaks, levels, achievements.
   * Using Cherry Points to unlock features or insights.
   * Optional opt-in programs where aggregated, anonymized behavior at Cherry Vine merchants can power better offers, while still keeping individual user-level data private.

5. **Optional integrations** (still not fronting):

   * Bank transaction read-only access to confirm behavior.
   * Receipt parsing to validate purchases.
   * Export to spreadsheets or accounting tools.
   * Merchant analytics products that consume only aggregate, anonymized Cherry data (e.g., “dining-budget adherence at your stores”) and never receive raw per-user histories.

6. **Cherry Vine & merchant ecosystem**:

   * Design and ship Cherry Vine as a hardware and firmware product that:

     * connects to POS/order systems via APIs, middleware, cloud, or printer ports
     * normalizes order context into a single internal shape
     * broadcasts that context in a secure, ephemeral way to nearby phones
   * Build a merchant onboarding pipeline:

     * registering stores and Vine devices
     * granting and revoking POS access tokens
     * configuring how data flows into Cherry’s Observe stage
   * Build merchant-facing analytics surfaces that:

     * expose only aggregated trends
     * help franchises understand behavior at the “moment of decision”
     * never reveal which specific person did what with which card.

At no point is “Cherry becomes a fronting card” on the roadmap.
That’s either a separate entity with licenses and a bank partner, or not part of Cherry at all.
Similarly, “Cherry Vine becomes a payment terminal” is not on the roadmap; if that ever happens, it is a separate, heavily regulated project with different constraints and partners.

---

## 12. Dev console surfaces (loop in the UI)

- Dashboard (`/`): unified header + metrics view anchoring spend, engine activity, and shortcuts into Scan, Simulate, Sessions, and tools.
- Statements (`/statements`): spend history that reflects bucket/budget impact and engine-tagged transactions.
- Scan (`/scan`): manual Observe → Evaluate surface for single contexts, with session handoff and Cherry Points preview.
- Sessions (`/sessions`): timeline of engine decisions, overrides, and Cherry Point states across Scan/Simulate/Vine.
- Vine simulator (`/vine-simulator`): hardware-context sandbox for `/api/vine/order`, showing the same engine outputs as Scan.
- Admin (`/admin`): health, seed/clear tools, and diagnostics; guarded as a dev-only surface.
- All pages share the same pattern (PageHeader → metrics → Panels + Empty/Error states) to reinforce Cherry as advisory, not a payment front.
- Buckets, Cards, and History/Activity surfaces follow the same console grammar, exposing budget constraints and recent engine events alongside standardized loading/empty/error handling.
- Spend history (`/history`) shows statement/bank timelines; Engine activity (`/activity`) shows engine-driven events (sessions, confirmations, ledger) under dev tools.

---

## 13. Engine Appendix

- Deterministic core: `EngineState + EngineContext → ranked actions + projections`, exposed via `solveDecision`/`safeSolveDecisionForUser` (`lib/engine/solver.ts`).
- Canonical types live in `lib/engine/types.ts` (`NormalizedCard`, `RewardRule`, `Bucket`, `DebtAccount`, `UserConstraints`); guardrails live in `lib/engine/guardrails.ts`; context/state builders in `lib/engine/context.ts`.
- Legacy compatibility (`runEngine`, card/bucket verdicts) sits in `lib/engine/legacy.ts` until all surfaces migrate.
- `/api/simulate`, `/api/scan`, and `/api/sessions` all wrap the engine through `safeSolveDecisionForUser` for graceful failures while mapping back to legacy response shapes.
- Scoring: explicit multi-objective utility over `rewards`, `runway`, `debtRelief` minus `volatility`/`ruleViolations`. Per-user weights come from `engineObjectiveProfile` + optional JSON overrides on `User`; invalid/unknown values clamp to balanced defaults and never throw. External API shapes stay the same; only ranking adapts to the profile.

---

## 14. Summary & Mantra

**Cherry’s identity in one line:**

> Cherry is the real-time advisor that tells you if you should swipe, which card to use, and what it does to your budget — then rewards you for listening.

**Not a card.
Not a processor.
Not an issuer.**

Just a very intelligent, slightly opinionated copilot that lives in your pocket and makes you better at money in the moments that matter.

In some stores, that copilot is aided by a small, dumb hardware node (Cherry Vine) that only whispers “this is the merchant and this is the amount” to your phone so Cherry can speak up at the right second. But the core remains the same: Cherry lives in your head and your phone, not in the rails.

This is the anchor.
Every feature, UI screen, API, integration, and hardware product (including Cherry Vine) should be checked against this:

* Does this keep Cherry as “observe → evaluate → recommend → reward”?
* Does this keep Cherry as “copilot, not card”?
* Does this keep Cherry Vine as “context broadcaster, not payment terminal”?

If yes → green light.
If no → rethink it.
