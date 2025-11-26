# Cherry Vision & Product Identity  
_A living document for how Cherry should exist in the world_

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

This document defines Cherry’s identity, constraints, and core product mechanisms so we never drift into illegal “card fronting” territory, and instead build a durable, legal, and actually more powerful engine.

---

## 1. The Core Identity

### 1.1. The Single Sentence

> **Cherry is a real-time spending copilot that tells you whether you should buy, which card to use, and how that choice affects your budget and rewards — then rewards you for following its advice.**

### 1.2. What Cherry Feels Like to a User

To an end user, Cherry feels like:

- That one obsessive friend who knows:
  - every rewards program
  - your paycheck dates
  - your actual budget
  - your upcoming obligations  
- …and stands next to you at the register and quietly says:
  - “Use Amex Gold here — 4x dining, you’re still $37 under budget.”  
  - Or: “If you swipe this, you’re blowing your Dining bucket. Are you sure?”  
  - Or: “Use your 2% card. This merchant doesn’t trigger any promos.”  

The user **still pulls out their own card**. Cherry never swipes for them.  
But psychologically, the card they pick feels “chosen by Cherry.”

---

## 2. What Cherry Explicitly Is Not

To avoid any legal/regulatory confusion, we draw hard lines.

### 2.1. Cherry is not:

- A **credit card** or **debit card**.
- A **“smart” front card** that holds multiple cards behind it.
- A **proxy BIN** that routes authorization to some underlying instrument.
- A **processor**, **gateway**, **program manager**, or **money transmitter**.
- A **custodian of funds** or an entity that “touches money.”

### 2.2. Cherry does not:

- Receive card PANs, CVV, or secure card data on its servers.
- Insert itself into the **authorization pipeline** (no fronting, no routing).
- Represent itself to a merchant as a valid payment instrument.
- Hold funds, escrow money, or delay settlement.
- Make or break the user’s ability to complete a transaction.

If the user’s card issuer declines the transaction, that’s between them and the bank.  
Cherry’s job is to say: “If you do this, here’s what it means for you.”

---

## 3. The Legal-Friendly Core Loop: Observe → Evaluate → Recommend → Reward

At a high level:

1. **Observe**: Cherry collects just enough context to know _where_ you’re about to spend and for roughly _how much_.
2. **Evaluate**: Cherry’s engine runs: bucket logic, card rewards logic, budget trajectory.
3. **Recommend**: Cherry tells you which card and whether this spend is “healthy” given your goals.
4. **Reward**: Cherry gives you Cherry Points if you follow the recommendation and confirm the purchase.

Let’s break this down.

---

## 4. “Observe” — How Cherry Sees the World (Without Touching Money)

Cherry needs context without entering the payment rails.

### 4.1. Inputs Cherry can legally and safely use

These are **non-payment** signals it can rely on:

- **User-initiated scans / taps**:
  - A Wallet Pass (Cherry Pass) opened in Apple Wallet.
  - An app “Scan” button tapped when they’re at checkout.
  - An App Clip triggered via NFC/QR at a merchant.

- **User-provided merchant information**:
  - User types in merchant name (“Chipotle”).
  - User selects merchant from auto-suggest (based on location).
  - User takes a photo of a receipt → OCR extracts merchant, amount.

- **Device context (with consent)**:
  - GPS location (rough coordinates).
  - Time of day.
  - Optional: known geofenced merchant polygons.

- **User’s internal Cherry data**:
  - Buckets (categories + budgets + periods).
  - Cards and reward rules.
  - Past simulated or “verified” transactions.

### 4.2. What “Observe” does NOT do

- Does not read card numbers.
- Does not act as POS or payment terminal.
- Does not talk to networks (Visa/Mastercard/Amex) directly.
- Does not intercept or modify the payment authorization message.

Cherry is basically building a **shadow model** of the transaction that’s about to happen, purely from user + context data.

---

## 5. “Evaluate” — The Engine’s Job

This is where your existing logic lives.

### 5.1. Inputs to the engine

- `userId`
- `merchantName` (or some merchant identifier)
- `category` (RewardCategory / MCC-derived)
- `amountCents` (estimated or exact)
- Timestamp (`now`)
- User’s:
  - Buckets
  - Cards
  - Reward rules
  - Past simulation/verified transaction history

### 5.2. What the engine computes

For a hypothetical transaction:

1. **Bucket selection and budget impact**:
   - Which bucket does this belong to (e.g., `DINING`)?
   - What is the current period (this week / this month)?
   - How much has the user already spent in this bucket?
   - After this transaction, will they be:
     - under budget?
     - at the limit?
     - over budget?

2. **Strict-mode logic**:
   - If the bucket is in **strict mode**, should Cherry advise “do not spend”?
   - If not strict, how aggressively should Cherry warn?

3. **Card optimization**:
   - Among all user cards, which:
    - matches the category exactly (e.g., DINING 4x)?
     - or falls back to general rewards (1–2% everywhere)?
   - What is the implied reward multiplier?
   - Are there any special rules (rotating categories, caps) in the future?

4. **Reward & decision summary**:
   - Recommended card.
   - Projected rewards (e.g., 200 points).
   - Proposed “Cherry Points” for compliance.
   - A classification:
     - ✅ “Healthy swipe”
     - ⚠️ “Borderline”
     - ❌ “Budget-breaking swipe (strict)”  

The engine returns a **decision object** summarizing this evaluation.

---

## 6. “Recommend” — How Cherry Talks to the User

Cherry’s recommendations should be:

- **Concrete**: “Use this specific card.”
- **Contextual**: “Here’s what this does to your budget.”
- **Actionable**: “Complete in X minutes to earn Y Cherry Points.”
- **Honest**: If it’s a bad idea financially, it should say so.

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

- **Push notification**: when user taps Cherry Pass in Wallet.
- **In-app banner / card**: “For this swipe, Cherry recommends…”
- **Lock screen Live Activity** (later): ongoing session while you’re in-store.
- **Wearable notification** (Apple Watch): super low friction.


The key: **Cherry recommends; user swipes**.  
Cherry is not in the transaction chain.

* * *

7\. “Reward” — The Cherry Points Loop
-------------------------------------

Cherry needs a reason for users to actually listen to it.

### 7.1. Cherry Points as a behavioral layer

- Cherry awards **Cherry Points** when:
  - You follow the recommended card.
  - You stay inside your bucket.
  - You continue to track your spending over time.
- Cherry Points are:
  - Initially: an internal, non-monetary gamification mechanism.
  - Eventually: may map to perks (discounts on premium, partner rewards, or just ego metrics like streaks, levels, ranks).

### 7.2. How compliance could be verified

Cherry cannot see the live card authorization, but it can still verify behavior via:

- **User confirmation flows**:
  - After recommendation, show “Did you complete the purchase with \[Amex Gold\]?” with quick Yes/No.
  - Confirm by:
    - user entering the exact amount
    - taking a photo of receipt
    - or selecting from parsed email receipts.
- **Email forwarding integration (future)**:
  - User forwards receipts to a Cherry email.
  - Cherry parses:
    - merchant name
    - amount
    - last 4 digits of card used (if visible)
    - time
  - Matches this with the recommendation window.
- **Bank data import (long-term)**:
  - Plaid / Tink / account aggregator to reconcile transactions.
  - This has its own compliance requirements, but still does not make Cherry a card.

### 7.3. Reward rules

Examples:

- +10 Cherry Points:
  - You used the recommended card and stayed within budget.
- +5:
  - You used the recommended card but overspent a bit (not strict-mode).
- 0:
  - You ignored Cherry entirely.
- Streak bonuses:
  - “7 days of following Cherry’s recommendations → +50 bonus points.”

* * *

8\. Product Surface: The “Cherry Pass” in Apple Wallet
------------------------------------------------------

Instead of a “Cherry Card” that pretends to be a payment card, Cherry has a **Wallet Pass**:

- It looks like a **loyalty card** or boarding pass:
  - Cherry logo
  - Your name
  - Your current Cherry Points
  - A “Scan before you pay” subtitle.
- When you tap it:
  - It opens the Cherry app / App Clip.
  - It can embed metadata (like a token) that identifies the user quickly.

### 8.1. Flow with Cherry Pass

1.  You are about to pay at a store.
    
2.  You open Apple Wallet, tap “Cherry Pass” (not a pay card).
    
3.  Cherry app/App Clip opens, reads:
    
    - Approximate location
        
    - Optional merchant selection UI
        
    - Optional amount input or estimate
        
4.  Cherry runs the engine.
    
5.  Cherry shows + optionally pushes:
    
    - “Use X card; this is your budget status; here’s how many Cherry Points you’ll earn.”
        
6.  You put your phone back down and use the recommended card normally.
    

Cherry is like a **ritual** before spending, not an instrument of payment.

* * *

9\. User Mental Model
---------------------

To the user, Cherry is:

- A **companion** to their wallet, not a wallet replacement.
    
- A **coach** for their money decisions, not a gatekeeper.
    
- A **reward layer** on top of doing the “smart” thing.
    

Key phrases we want users to think:

- “I let Cherry choose my card.”
    
- “I check Cherry before I swipe.”
    
- “Cherry keeps me honest with my budgets.”
    
- “I get Cherry Points for following the plan.”
    

Not:

- “Cherry is where my money lives.”
    
- “I pay with Cherry.”
    
- “Cherry is ‘my card’.”
    

* * *

10\. Positioning vs. Other Products
-----------------------------------

### 10.1. vs “Smart Cards” (Curve, etc.)

Smart cards:

- Intercept transactions.
    
- Route payments to different underlying cards.
    
- Live in the authorization path.
    
- Are legally complex, regulated, and fragile.
    

Cherry:

- Does not intercept transactions.
    
- Does not route payments.
    
- Lives entirely outside the authorization path.
    
- Advises + rewards behavior, with much lower risk.
    

### 10.2. vs Budgeting apps (Mint, YNAB)

Budgeting apps:

- Are mostly **after-the-fact**.
    
- Show you what you did last week/month.
    
- Rarely influence the _moment of decision_.
    

Cherry:

- Is **pre-swipe** and **real-time**.
    
- Influences behavior **before** money moves.
    
- Connects budgeting + card rewards in a single UI and engine.
    

### 10.3. vs Rewards content sites (NerdWallet, TPG)

Content sites:

- Teach you which card is good in general.
    
- Do not know:
    
    - your live budget
        
    - your actual cards
        
    - your specific situation at the register.
        

Cherry:

- Knows your **real** cards and their rules.
    
- Knows your **buckets and budgets**.
    
- Knows where you are **right now**.
    
- Gives a **single concrete recommendation** at the moment of truth.
    

* * *

11\. Technical & Legal Boundaries (for devs)
--------------------------------------------

When building Cherry, devs must respect these boundaries:

- **NO**:
    
    - Storing full PAN, CVV, track2, or chip data.
        
    - Acting as a payment processor, gateway, or issuer.
        
    - Advertising Cherry as a “card” to tap at terminals.
        
    - Emulating a network brand (Visa/Mastercard/Amex/Discover) on a pass.
        
- **YES**:
    
    - Storing anonymized card metadata (nickname, issuer, last 4).
        
    - Storing your own reward/routing logic.
        
    - Storing user budgets, rules, and Cherry Points.
        
    - Offering advice, forecasts, and recommendations.
        

This doc should be treated as a **guardrail**:  
Any feature that looks like it might cross into “proxy card” territory should be rejected at this layer.

* * *

12\. Roadmap Implications
-------------------------

Because Cherry is defined as a **copilot, not a card**, the roadmap naturally centers around:

1.  **Better observation**:
    
    - Stronger merchant inference (MCC mapping, location + merchant DB).
        
    - Cleaner ways to input transactions quickly (receipt OCR, simple forms).
        
2.  **Smarter evaluation**:
    
    - More nuanced bucket types (savings goals, debt payoff).
        
    - “If you keep doing this, you’ll overshoot by X by end of month.”
        
3.  **Clearer recommendations**:
    
    - Simple language that builds trust.
        
    - Handling edge cases (“No card gives bonus here; use lowest APR”).
        
4.  **Deeper reward loops**:
    
    - Streaks, levels, achievements.
        
    - Using Cherry Points to unlock features or insights.
        
5.  **Optional integrations** (still not fronting):
    
    - Bank transaction read-only access to confirm behavior.
        
    - Receipt parsing to validate purchases.
        
    - Export to spreadsheets or accounting tools.
        

At no point is “Cherry becomes a fronting card” on the roadmap.  
That’s either a separate entity with licenses and a bank partner, or not part of Cherry at all.

* * *

13\. Summary & Mantra
---------------------

**Cherry’s identity in one line:**

> Cherry is the real-time advisor that tells you if you should swipe, which card to use, and what it does to your budget — then rewards you for listening.

**Not a card.  
Not a processor.  
Not an issuer.**

Just a very intelligent, slightly opinionated copilot that lives in your pocket and makes you better at money in the moments that matter.

This is the anchor.  
Every feature, UI screen, API, and integration should be checked against this:

- Does this keep Cherry as “observe → evaluate → recommend → reward”?
    
- Does this keep Cherry as “copilot, not card”?

If yes → green light.
If no → rethink it.