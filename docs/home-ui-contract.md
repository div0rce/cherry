Status: Active
Last updated: 2026-01-03

# Home UI Contract (Idle / Observe)

## Purpose
- Define the renderer contract for the Home (Idle / Observe) surface at `app/(user)/app/page.tsx`.
- Keep Home advisory-only and separate from Autopilot (Decide). No authority, no routing, no “best card”.
- Align with `AGENTS.md`, `docs/legal-constraints.md`, and UI specs here. Two orthogonal modes remain non-negotiable: Home = Idle/Observe, Autopilot = Decide (optional, intent-driven).

## Current behavior (enforced / in code)
- `getHomeUiBundle` in `lib/home/ui-bundle.ts` returns a stubbed, read-only `HomeUiBundle` scoped to the signed-in user; no derived logic lives in the component.
- `HomeScreen` renders the bundle verbatim: Cherry header + subtitle + mode/simulation badges, a “This month” hero with badge + primary metric + buffer bar + one-sentence explanation + plan definition, a single dominant CTA (`Plan a purchase`) that routes to Autopilot intent declaration, and read-only sections for Heads up, Buckets (top 3), Upcoming, and Recent DecisionEvents.
- Layout is a single vertical column with neutral background, radius 16–24px, spacing 8/12/16/24/32. Cherry red is accent-only; severity uses neutrals/amber/orange bands (no alarm red).
- Severity is advisory only (info / caution / risk). No approval/decline/authorization language is present on Home.

## Future/Target behavior
- Populate `HomeUiBundle` from engine-derived month state, buckets runtime helpers, upcoming obligations, and decision event history once wiring is available.
- Preserve the same contract and max lengths; keep Home read-only and authority-free even after engine wiring lands. Autopilot (Decide) stays opt-in and separate.

## Contract: `HomeUiBundle`
- `mode` — explicit authority and data scope
  - `label` (string) — headline mode label (e.g., “Mode: Advisory only”).
  - `detail` (string) — one sentence clarifying power (“will not block or move money”).
  - `simulationLabel` (string) — badge for simulation/read-only data.
  - `simulationDetail` (string) — scope of data/simulation caveat.
- `plan` — plan name and framing
  - `name` (string) — short plan name (e.g., “Essentials-first budget”).
  - `detail` (string) — plan summary in one sentence.
- `monthState` — hero card
  - `title` (string) — usually “This month”.
  - `badge` — `{ label: string; tone: 'stable' | 'tight' | 'risky' }`.
  - `primaryMetric` — `{ kind: 'pace' | 'essentials_buffer' | 'safe_to_spend'; label; value; helper }`.
  - `bufferBar` — `{ label: string; usedPercent: number; remainingLabel: string }` visualizes buffer usage; percent is bounded [0,100].
  - `explanation` (string) — one-sentence, engine-generated, neutral.
  - `planDefinition` (string) — explicit one-line plan/guardrail statement.
  - `cta` — `{ label; href }` secondary CTA inside the hero.
- `headsUp[]` (max 3) — `{ id; title; detail; severity: 'info' | 'caution' | 'risk' }`; no enforcement language.
- `bucketPreview[]` (max 3) — `{ id; name; remaining; usedPercent }`; progress bars only (severity-banded rendering).
- `upcoming[]` (max 3) — `{ id; name; dateLabel; amountLabel? }`.
- `recent[]` (max 3) — `{ id; title; detail; amountLabel; category }` reflecting DecisionEvents.
- `emptyStates` — strings for the empty variants of each panel.

### Rendering rules
- Render bundle values verbatim; do not invent copy, re-interpret severity/metrics, or inject authority language.
- Layout: single-column stack, neutral background, card radius 16–24px, spacing 8/12/16/24/32 scale. Keep advisory mode visually distinct from Autopilot/Decide with a single mode banner and neutral styling.
- Primary CTA is singular and dominant: `Plan a purchase` routes to Autopilot intent declaration. Copy reiterates “simulation only / opt-in Autopilot”.
- Home shows state only: Heads up (max 3), Buckets preview (top 3), Upcoming, Recent DecisionEvents. No “best card”, no purchase recommendations, no authority verbs.
- Forbidden on Home: “approve”, “decline”, “authorize”, “terminal”, “proxy”, “best card”, or any implication of payment routing. Cross-check with `docs/legal-constraints.md`.

### Explanation semantics (non-negotiable)
- Explanations may describe state only.
- Explanations must not:
  - suggest actions
  - imply causality (“if you do X”)
  - reference cards, merchants, or categories as choices
  - compare alternatives
- Allowed forms:
  - descriptive (“Essentials buffer is partially used”)
  - temporal (“Mid-month snapshot”)
  - factual (“Two essential buckets are near limit”)

### Primary metric interpretation
- Primary metrics communicate state, not permission.
- They must not be framed as allowances, approvals, recommendations, or limits enforced by Cherry.

## Guardrails & tests
- Contract and guardrails enforced by `tests/home-ui-contract.test.ts` and Home surface tests; they ensure the bundle is authority-free, honors max lengths, and keeps Autopilot gated behind intent declaration.
- If Home behavior changes, update this document, `lib/home/ui-bundle.ts`, and associated tests together.

## Related docs
- `docs/legal-constraints.md`
- `docs/cherry-vision.md`
- `docs/authority-v1.md`
