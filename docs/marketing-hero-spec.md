Status: Active
Last updated: 2025-12-04

# Cherry Marketing Hero Spec

## Current behavior
- Hero landing page exists under `/` via the marketing route group, front-loading proof, single CTA, and loss-aversion framing while keeping Cherry strictly advisory.

## Future/Target behavior
- Swap the mock animation for a live Lottie/MP4 tied to real engine traces.
- Wire CTAs to the chosen growth funnel (sign-in, app deep link) once finalized.
- Validate the loss-range copy with data; trim or localize once confirmed.

---

## 1. Psychological Strategy (Retain, Convert, Reduce Friction)
1. **Instant Value Compression (≤ 7 words).** One-line utility, one-line mechanism, one-line proof.
2. **Zero-Ambiguity Call to Action.** A single red primary button (no dual CTAs).
3. **Social Proof Early.** Trust leads immediately.
4. **Loss Aversion First.** “Stop losing money on bad card usage.”
5. **Cognitive Ease.** White background, red/green accents, large whitespace, minimal copy.
6. **Authority Bias.** “Powered by autonomous scoring engine” (or equivalent).
7. **Temporal Proximity Bias.** “Try it in 10 seconds.”

---

## 2. Hero Section Blueprint
**Layout**
```
-----------------------------------------------------------
|  LOGO (Cherry glyph) top-left — minimal                |
|                                                       |
|  [LEFT COLUMN]                                        |
|   H1: 6–7 words max                                   |
|   Subhead: one-line mechanism                         |
|   Proof bar                                           |
|   Primary CTA                                         |
|                                                       |
|  [RIGHT COLUMN]                                       |
|   Animated card-oracle screen mockup                  |
-----------------------------------------------------------
```

**Content (use literally)**
- **H1:** **Spend smarter automatically.**
- **Subhead:** Cherry picks the right card for every purchase—instantly, with zero setup.
- **Proof Bar:** • Backed by a real scoring engine  • Used by power spenders  • Privacy-first architecture
- **CTA:** **Get Started — Free**
- **Microcopy:** “No credit card required. No bank changes.”

**Visuals**
1. Right-side animation: rotating carousel — merchant → Cherry selects the optimal card → projected reward saved.
2. Color: Red accent, green micro-highlights, white background.
3. Typography: Heavy grotesk for headline; mono/semi-mono for sub-lines.

---

## 3. Mid-Hero Reinforcement (Below-the-Fold Immediately)
### “Why Cherry Works”
Three-column strip:
1. Autopilot Intelligence — “Real-time scoring across your wallets, cards, and habits.”
2. Maximized Rewards — “Never waste 3% cash-back again.”
3. No Setup Required — “Open the app, make a purchase, Cherry handles the math.”

### Loss Aversion Slice
Banner:
> “You’re losing $200–$800 yearly by using the wrong card.”
> **“Cherry closes that gap automatically.”**

---

## 4. Social Proof & Safety
**Trust Band:** “Trusted by students, engineers, and frequent travelers.”

**Testimonials (≤12 words, relief-focused):**
- “I stopped guessing which card to use.”
- “Cherry saves me money every week.”
- “This replaced three apps.”

---

## 5. Product Explanation Block
### “How Cherry Works” (≤20 words total)
1. Scan or connect your cards.
2. Cherry builds a private, local spending model.
3. Every purchase: one clear recommendation.

---

## 6. Final Conversion Section
- **H2:** **Make every purchase the right one.**
- **CTA:** **Start Cherry — Free**
- Secondary link: “Learn how it works.”

---

## 7. UI Components / Tokens
1. Red `#D1193A` (primary).
2. Green `#0EA463` (success indicators).
3. White `#FFFFFF` (background).
4. Shadow-sm + rounded-xl cards.
5. Asymmetric grid layout mirroring Apple financial surfaces.
6. Glass/blur only for demo accents, not primaries.

---

## 8. Reference Patterns (Do not copy, use as cues)
- **RocketMoney:** Value-first headers, short text, clear CTA.
- **AwardWallet:** Immediate function communication; structured, not dense.
- **MaxRewards:** Hero animation shows product doing something; good for right-column demo.
- Cherry should blend RocketMoney brevity + MaxRewards demonstration + Apple-like hierarchy.

---

## 9. Engineering Deliverables
1. Implement `/app/(marketing)/page.tsx`.
2. Container width `max-w-7xl`, `py-24`.
3. Grid: `grid grid-cols-1 md:grid-cols-2 gap-12`.
4. Type scale: `text-5xl font-semibold tracking-tight` for H1; `text-lg text-slate-600` for subhead.
5. CTA: `<Button variant="primary" className="bg-cherry-red hover:bg-cherry-red/90">Get Started — Free</Button>`.
6. Right column: Lottie/MP4 mock of “Cherry choosing a card.”
7. Trust bar immediately under fold.
8. Sticky CTA for mobile.

---

## 10. Optional Extensions
- Exact Figma wireframes (textual spec).
- Tailwind + React code for full hero page.
- Copy variants for A/B tests.
- Psychological rationale per phrase.

---

## 11. Figma Wireframes (Text Spec)
### Frames
1. Desktop 1440×900, 12-column grid, margin 96px, gutter 24px.
2. Mobile 390×844, margin 16px, single-column.

### Desktop Layout — Sections
**Hero**
- Top bar: Cherry logo; right “Sign in” link.
- Main grid: left columns 1–6 (copy stack), right columns 7–12 (mock/animation).
- Copy stack: H1, subhead, proof bar (pills), CTA button, microcopy.
- Mock: off-white card frame showing merchant, cards, recommendation, yearly savings.

**Section 2: “Why Cherry Works”** — three cards (icon, heading, one-line body).

**Section 3: Loss Aversion Banner** — pale red band: loss statement + “Cherry closes that gap automatically.”

**Section 4: Social Proof** — micro-heading, trust band (students/engineers/travelers), testimonial cards (≤12 words).

**Section 5: “How Cherry Works”** — 3-step timeline (icon, heading, one sentence).

**Section 6: Final Conversion** — centered: H2, subtext, primary CTA, “Learn how it works” link.

### Mobile Rules
- Stacked sections; hero mock below copy.
- Proof bar stacks (no dot separators).
- Testimonials become full-width vertical cards.
- Loss banner becomes two-line block.

---

## 12. Tailwind + React Implementation (Hero Page)
Reference implementation lives in `/app/(marketing)/page.tsx` using Button + Card primitives, light background, red primary CTA, and card-selection mock with progress indicator and recommendation list. CTA microcopy: “No credit card required. No bank changes.”

---

## 13. Conversion Copy Variants (A/B Sets)
**Variant A (Baseline)** — H1 “Spend smarter automatically.” Subhead “Cherry picks the right card…” CTA “Get Started — Free” Microcopy “No credit card required. No bank changes.”

**Variant B (Loss-aversion)** — H1 “Stop wasting rewards on every swipe.” Subhead “Cherry catches the best card…” CTA “Stop Losing Money” Microcopy “Takes under a minute. You keep your existing banks.”

**Variant C (Speed + authority)** — H1 “A scoring engine for your wallet.” Subhead “Cherry runs the math…” CTA “Try the Engine Free” Microcopy “No spreadsheets. No setup. Just a decision.”

**Loss Banner Variants**
- A: “You’re losing $200–$800 yearly by using the wrong card. Cherry closes that gap automatically.”
- B: “Every wrong swipe throws away rewards. Cherry stops the leak.”

**Testimonial Set 2**
- “Cherry just tells me which card to tap.”
- “Feels like auto-pilot for my credit cards.”
- “I stopped opening five apps before I pay.”

---

## 14. Psychological Deep-Dive (Phrase-Level)
- **H1:** “Spend smarter automatically.” — anchors spending domain, promises competence + automation.
- **Subhead:** “Cherry picks the right card…” — unit of action (card choice), total coverage, speed, zero setup.
- **Proof Bar:** “Backed by a real scoring engine · Used by power spenders · Privacy-first architecture” — authority + aspirational identity + objection handling.
- **CTA:** “Get Started — Free” — low-commitment, no monetary risk.
- **Safety Microcopy:** “No credit card required. No bank changes.” — disarms charge/migration fears.
- **Loss Banner:** frames status quo as cost; Cherry repairs it automatically.
- **Testimonials:** relief- and simplicity-focused to match money-anxious users.
- **How It Works:** scan/connect → private local model → one recommendation; teaches loop without over-explaining.
