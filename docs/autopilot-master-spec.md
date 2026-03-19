Status: Active
Last updated: 2026-01-03

# Autopilot Master Spec

Scope: Autopilot subsystem only (UI `/app/autopilot`, `/api/autopilot/*`, adapter, and solver entry). This does not redefine global engine semantics, bank ingest, or Cherry Pass/Vine behavior.

Document purpose: Define the complete architecture, lifecycle, contracts, and invariants of the Autopilot subsystem.  
Governed subsystems: Autopilot UI (`/app/autopilot`), Autopilot adapter (`runSimulation`), Preview API (`/api/autopilot/preview`), Commit API (if present), and solver entry (`public.getAutopilotDecisionForUserSwipe`). This doc must stay aligned with `docs/autopilot-engine-adapter.md`, `docs/autopilot-integration-summary.md`, and the validation/service layers named below.

## Current behavior (enforced / in code)
- Preview is read-only and advisory; commit is transitional and may write simulated transactions and bucket updates.
- Autopilot uses the engine solver via `getAutopilotDecisionForUserSwipe` and authority_v1 for advisory warnings.
- UI remains render-only; mapping lives in `lib/autopilot/runSimulation.ts`.

## Implementation status
- Phase 1 — Autopilot preview wiring (UI ↔ adapter ↔ /preview ↔ engine): **COMPLETE**. Implemented in `app/api/autopilot/preview/route.ts`, `lib/autopilot/service.ts`, `lib/autopilot/runSimulation.ts`, `lib/validation/autopilot/preview.ts`, with coverage in `tests/api-autopilot-preview.test.js`, `tests/api-autopilot.user-context.test.ts`, and `tests/autopilot-runSimulation.test.js`.
- Phase 2 — Autopilot preview reliability/observability: **COMPLETE**. Structured errors `{ error, code }`, engine timeout (503/`ENGINE_TIMEOUT`), metrics (request counts, status breakdown, latencies, bucket pressure/warnings) added to `/api/autopilot/preview` and `lib/autopilot/service.ts`, with adapter-aware error handling in `lib/autopilot/runSimulation.ts`.
- Phase 3 — Autopilot commit re-spec (sessions/ledger alignment): **NOT COMPLETE**. Target contract is defined in §17; implementation is gated behind `AUTOPILOT_COMMIT_V2` and pending migration/backfill off the transitional bucket-mutating commit.

## 1. Autopilot Identity and Positioning
Autopilot is Cherry’s before-purchase spend planning copilot. It observes user-provided context (merchant, amount, category, timing), evaluates through the Cherry engine, recommends a card and budget impact, and presents advisory outputs. Autopilot is not a card, proxy, processor, terminal, or authorization layer; it never fronts or routes payments.

## 2. Surfaces and Entry Points
- `/app/autopilot` (AutopilotShell): user-facing page that gathers context and renders results; stateless aside from client state.
- `/api/autopilot/preview`: advisory API; auth required; consumes merchant/amount/category/occurredAt; returns an engine-backed preview; stateless (no bucket/session mutation).
- `/api/autopilot/commit` (transitional): optional follow-up to persist a simulated swipe; auth required; re-evaluates via the same engine flow as preview, **writes a simulated transaction**, and **may mutate bucket state** when a valid `bucketDelta` is present. It does not create `RecommendationSession` or ledger rows today and should be treated as experimental until the Phase 3 commit spec is finalized.
- Engine entry: `lib/engine/public.getAutopilotDecisionForUserSwipe` invoked by the preview service.
- Validation entry: `lib/validation/autopilot/preview.ts` (input + output schemas; single source used by route, service, adapter).
- Service entry: `lib/autopilot/service.ts#getAutopilotPreview` (engine orchestration + DTO mapping + output validation; no writes).

For each:
- Caller: UI (preview), backend service (commit).  
- Inputs/outputs: preview request/response defined by `AutopilotPreviewOutputSchema`; commit request/response defined by `AutopilotCommitInputSchema`/result.  
- Mutations: preview is read-only; commit may write simulated transaction/bucket adjustments.

## 3. Autopilot Invariants (MUST Hold Across All Implementations)
- Preview (`/api/autopilot/preview`) never mutates buckets, sessions, ledger, or simulated transactions; it is read-only.
- Autopilot commit must never be exposed in user-facing UI prior to Phase 3; any invocation before that is restricted to tests or controlled internal tooling.
- Autopilot warnings and states are UI posture only and must not be interpreted as authority verdicts or enforcement signals.
- Adapter output `AutopilotSimulationResult` always satisfies:
  - `impactSegments.length === 3`
  - `rewardStrength ∈ {1,2,3,4}`
  - `cards[0]` represents the primary recommendation; UI must not infer alternate semantics beyond provided fields.
- UI renders purely from `AutopilotSimulationResult`; no hidden business logic or alternate branching.
- Preview responses are engine-backed or explicit fallback/blocked with warnings; never silent partials.
- Auth is required for preview/commit; no anonymous Autopilot.
- All copy and behavior remain advisory-only; no payment, routing, or authorization is implied.
- If preview fails, the last successful result remains visible; errors surface via `simulationError`/`errorTimestamp`.
- UI must never branch on raw preview payload; it consumes only the mapped `AutopilotSimulationResult`.
- Autopilot uses the same solver path as `/api/scan`; no forked logic is permitted.
- Phase 3 (target): Autopilot commit must route through the shared confirm pipeline (same as `/api/sessions/confirm`); direct bucket/ledger writes in Autopilot code are forbidden. `(userId, decisionId)` is the canonical idempotency key across sessions, commits, and ledger entries originating from Autopilot.

## 4. Commit Path (Current vs Target Behavior)
The detailed target commit contract and confirm-pipeline integration are specified in §17.
- Current:
  - `/api/autopilot/commit` is optional/transitional; validates input via `AutopilotCommitInputSchema`, requires auth, and re-evaluates via `evaluateAutopilot` using the same engine flow as preview.
  - Enforces idempotency by recomputing a decision fingerprint (`decisionId`) from `{ userId, merchant, amountCents, occurredAt }` and comparing to the request.
  - Resolves category via `resolveScanCategory` for the simulated transaction.
  - Inside a single DB transaction:
    - If a `simulatedTransaction` with this `decisionId` already exists, returns `status: "already_exists"` and may refresh the bucket snapshot.
    - Otherwise, if the engine provided a `bucketDelta` and the bucket belongs to the user, it ensures freshness via `ensureBucketFresh`, computes `bucketBefore`/`bucketAfter` with `computeBucketBalance`/`computeBucketBalanceFromNumbers`, and when the delta is positive **updates the bucket** (`spentCents`, `currentAmount`) to reflect the simulated swipe.
    - Writes a `simulatedTransaction` row with `status: APPROVED`, amount, merchant, resolved category, bucket identifiers and before/after/limit cents, chosen card info, and reason `AUTOPILOT_COMMIT`.
  - Does **not** create `RecommendationSession` or `CherryPointLedger` rows today, but **does mutate bucket state** when a valid `bucketDelta` is present. This behavior is **transitional** and is **not** part of the Autopilot Phase 1 preview spec; any production use of commit must go through a dedicated Phase 3 spec.
- Target:
  - Keep commit optional and clearly labeled as advisory/simulated; no points awarded.
  - If linked to sessions/ledger in the future, define explicit mapping to `RecommendationSession` and `CherryPointLedger`, with guardrails to avoid double-counting and to respect advisory-only scope.
  - Align commit semantics with the advisory-only positioning and bucket/session semantics used by `/api/sessions` confirm flows, or deprecate Autopilot commit in favor of session-based confirmation. Until then, treat commit as experimental and not user-facing.

## 5. Autopilot Life-Cycle and State Machine
Current lifecycle (implemented): Idle (no summary) → Simulating (form submit triggers `runSimulation`/preview) → Recommended/Warning (adapter maps preview to `AutopilotSimulationResult`) → Optional Commit (simulated transaction write only, no sessions/ledger) or Ignore. Preview remains stateless regardless of commit.

Target lifecycle (Phase 3, see §17): Idle → Simulating → Recommended/Warning → Optional Commit (shared confirm pipeline creates/updates `RecommendationSession` + ledger, advisory-only, no payment rails) or Ignore. Preview stays stateless/read-only.

Relationship to `/api/scan`: `/api/scan` is the general-purpose pre-swipe advisor used by Pass/Vine/manual triggers and can seed sessions/ledger flows. `/api/autopilot/preview` is user-initiated, UI-driven, and stateless; it wraps the same solver for planning and must not mutate sessions, buckets, or ledger. Autopilot is a structured planning sandbox and does not replace `/api/scan`; both share the solver and category resolution. Commit (target in Phase 3) transitions into the shared confirm pipeline to create/update `RecommendationSession` and ledger rows while remaining advisory-only (no payment rails).

Verbal diagrams:
- Data flow: User → AutopilotShell (client state) → `runSimulation(summary)` → POST `/api/autopilot/preview` → `service.getAutopilotPreview` → solver (`safeSolveDecisionForUser`) → preview payload → adapter maps to `AutopilotSimulationResult` → UI renders purely from `AutopilotSimulationResult`.
- Lifecycle: Idle → Simulating → Recommended (safe) or Warning (caution/fallback/blocked) → (Optional) Commit (current: simulated transaction only; target: shared confirm pipeline/session+ledger) or Ignore.

## 6. Engine Contract for Autopilot
`lib/engine/public.getAutopilotDecisionForUserSwipe` requires: authenticated `userId`, normalized merchant name, positive `amountCents`, card universe IDs, and resolved category (via scan helper). It produces: decision kind (`OK`/`FALLBACK`/`BLOCKED`), recommended card ID (or null), known monetary benefit vs runner-up when computable, raw issuer-points delta when applicable, optional bucket delta (remaining/spent projections), reason code, and user-facing message. Internally it calls the solver (`safeSolveDecisionForUser`) using bounded heuristic scoring weights (`rewards`, `runway`, `debtRelief`) and filters to card actions only.

## 7. Preview Backend Integration Contract (/api/autopilot/preview)
- Request (`/api/autopilot/preview`): JSON with `merchant` (string, trimmed, required), `amountCents` (positive int), optional `occurredAt`, **required** `category` (`AutopilotRewardCategory`). Auth required (`resolveUserContext`, allow lab demo). Stateless: no bucket writes. Parsed via `AutopilotPreviewInputSchema` in `lib/validation/autopilot/preview.ts`.
- Response: JSON validated by `AutopilotPreviewOutputSchema` (decisionId, merchant, amountCents, occurredAt, status `ok|blocked|fallback`, recommendedCard, `expectedMonetaryBenefitCents`, `expectedPointsDelta`, explanation/UI bundle, bucketImpact {id, name, remainingCents, spentCents} | null, reasonCode).  
- Status semantics: `ok` when engine returns a usable card; `blocked` when guardrails prevent safe recommendation; `fallback` when engine cannot produce a safe decision. Categories normalized via UI string → `AutopilotRewardCategory` → engine RewardCategory resolver; `occurredAt` defaults to “now” when absent.
- Data flow (verbal diagram): UI (`AutopilotShell` form) → adapter (`runSimulation`) → preview route (`/api/autopilot/preview`) → service (`lib/autopilot/service#getAutopilotPreview`) → engine entry (`getAutopilotDecisionForUserSwipe` → solver) → preview response → adapter maps to `AutopilotSimulationResult` → UI renders panel.
- Error shape: all non-200 responses from `/api/autopilot/preview` include `{ error, code }` (e.g., `INVALID_PAYLOAD`, `UNAUTHORIZED`, `ENGINE_ERROR`, `ENGINE_TIMEOUT`, `PREVIEW_UNEXPECTED_ERROR`).
- Timeout: engine evaluation is wrapped in a 1.5s timeout returning `503/ENGINE_TIMEOUT` on breach.
- Metrics: route/service emit counters for request totals (by HTTP and preview status), bucket pressure, warnings, invalid outputs, plus durations (`autopilot_preview_route_ms`, `autopilot_preview_total_ms`).

## 8. Adapter Contract (`runSimulation`)
`runSimulation(summary: AutopilotPurchaseSummary)` (client):
- Transforms `{ amount (dollars), merchant, category ("dining"|"groceries"|"travel"|"gas"|"other"), timing }` into preview payload `{ merchant, amountCents, occurredAt: now, category: AutopilotRewardCategory }`.
- Fetches `/api/autopilot/preview` with credentials; rejects on non-200 or invalid schema.
- Maps preview → `AutopilotSimulationResult`:
  - `state`: `recommended` only when status is `ok` and no warnings/budget exhaustion; else `warning`.
  - `cards`: primary from `recommendedCard`/primary message; secondary placeholder with neutral tone.
  - `rewardStrength`: bands from known monetary benefit/amount when available, otherwise issuer-points delta heuristics (1–4).
  - `impactSegments`: derived from bucketImpact used/remaining; always exactly 3 entries (padded if missing).
  - `impactNotes`: bucket remaining note + preview secondary + warnings.
  - Safety badges: green for recommended, amber for warning; CTAs are text-only.
  - Preserves advisory-only semantics; no writes.
- UI components consume only `AutopilotSimulationResult`; they must not embed logic.

AutopilotSimulationResult Field Contract Table:

| Field | Meaning | Source | Invariants | UI may assume | UI must not assume |
| --- | --- | --- | --- | --- | --- |
| `state` | Recommended vs warning posture | Adapter (preview status + warnings) | `"recommended"` or `"warning"` | Drives badge tone and risk banner | Payment/authorization implication |
| `cards[0]` | Primary recommendation card/name/message | Adapter (recommendedCard/explanation) | Exists when preview returns; labelTone matches state | It is the best available card | That it triggers payment or is guaranteed available |
| `cards[1]` | Alternate neutral option | Adapter (placeholder/secondary) | Optional; labelTone `neutral` | Secondary text only | Any business logic difference |
| `rewardStrength` | Benefit ratio band | Adapter (expectedBenefit/amount) | Integer 1–4 | More dots = stronger rewards | Exact cents or APR |
| `rewardStrengthLabel` | Text label for strength | Adapter | Non-empty string | Descriptive only | Numeric precision |
| `impactSegments` | Three budget segments (remaining/used/other) | Adapter (bucketImpact or fallback) | Length = 3; percentages clamp 0–100 | Bar render matches percentages | Exact bucket math beyond provided values |
| `impactNotes` | Bullet copy about budget/rewards | Adapter (bucketImpact + explanation) | Array, may be empty | Textual guidance only | That notes imply persistence |
| `monthImpactSummary` | One-line month impact | Adapter (remaining + benefit) | Non-empty | Display as-is | Hidden promises on buckets |
| `monthImpactTitle` | Section label | Adapter | Non-empty | Title only | Implied action |
| `monthImpact.riskNote` | Narrative warning/note about risk | Adapter (warnings) | String (may be empty) | Display as text | Any enforcement |
| `categoryLabel` / `timingLabel` | Human-friendly labels | Adapter (UI input) | Non-empty | Display only | Engine category precision |
| `recommendationSectionLabel` / `alternativeSectionLabel` | Section headers | Adapter | Non-empty | Display only | Additional logic |
| `safetyBadgeClass` / `safetyBadgeDotClass` / `safetyBadgeLabel` | Styling + label for safety | Adapter (state) | Non-empty, consistent with state | Visual indicator only | Approval/denial of spend |
| `ctaPrimary` / `ctaSecondary` | Text CTAs (no actions) | Adapter | Non-empty | Labels only; sandbox planning | That clicking performs payment or mutation |
| `riskBanner` | Warning banner | Adapter (first warning) | Optional string | Show when present | Severity beyond provided text |
| `errorTimestamp` | When an error occurred | Adapter (on error) | ISO string or undefined | Display as metadata | Any mutation timing |

## 9. UI Rendering Contract
- `AutopilotShell`: manages form state, calls `runSimulation`, passes data/errors/loading to panel.
- `AutopilotDecisionPanel`: renders four modes—idle (no purchase), loading (during fetch), error (shows simulationError, keeps last good result), recommendation (uses `AutopilotSimulationResult`). Uses rewardStrength dots, safety badges, CTAs as labels only.
- `AutopilotMonthImpactBar`: expects exactly 3 segments with labels/colors/percentages; falls back if shape is invalid.
- `AutopilotPurchaseForm`: captures amount/merchant/category/timing; no business logic.

## 10. Error Handling and Degradation
- Engine/preview failure or invalid response: `runSimulation` throws with `errorTimestamp`; UI surfaces `simulationError` and leaves last successful result visible.
- Network errors: same as above; no state mutation.
- Degraded engine decisions (`status = fallback/blocked`): map to `state = warning`, risk banner from first warning, and neutral/negative card labels.

## 11. Relationship to Existing Engine Surfaces
Currently, Autopilot uses the same solver as `/api/scan` and `/api/sessions` (`safeSolveDecisionForUser`), filtered to card actions. It is a dedicated lens, not a different solver profile. It does not persist sessions/ledger rows (unlike `/api/sessions`) and does not mutate buckets on preview (unlike confirm flows). `/api/autopilot/commit` is analogous to simulated transaction commit today; the target confirm-pipeline behavior is defined in §17.

## 12. Current vs Target Behavior
- Engine contract  
  - Current: Uses standard solver via `getAutopilotDecisionForUserSwipe`, card-only actions, benefit vs runner-up, optional bucket delta.  
  - Target: Same solver but add clearer reason codes and surface constraint tags in the preview response for richer UI messaging (still advisory).
- Preview route  
  - Current: Auth required, stateless, validates payload with Zod (`lib/validation/autopilot/preview.ts`), re-validates output in service + route, returns preview shape; status reflects solver outcome.  
  - Target: Add rate limits, richer telemetry/dashboarding, and explicit response versioning while keeping the route stateless.
- Adapter (`runSimulation`)  
  - Current: Fetches preview with credentials, validates schema, maps to `AutopilotSimulationResult`, pads segments, rewardStrength bands fixed.  
  - Target: Classify backend error codes in client state and optionally record client-side latency/error metrics while keeping the adapter contract stable and error shape unchanged.
- Commit (target): Follows the shared confirm pipeline defined in §17; aligns sessions/ledger with advisory-only semantics and forbids direct bucket math in Autopilot code.
- UI  
  - Current: Pure renderer; idle/loading/error/recommendation states; CTAs are informational.  
  - Target: Add explicit “advisory only” copy on CTAs and hook into future commit flow without adding logic to components.
- Lifecycle  
  - Current: No session/ledger link; commit writes simulated transactions only.  
  - Target: Optional handoff to sessions/ledger while respecting advisory boundaries and avoiding double counting.

## 13. Testing and Observability
- Required tests: unit test for `runSimulation` mapping (exists: `tests/autopilot-runSimulation.test.js`); backend preview tests for happy/error/auth paths (exists: `tests/api-autopilot-preview.test.js`, `tests/api-autopilot.user-context.test.ts`); reliability tests for error codes/timeouts (e.g., `tests/autopilot-service-timeout.test.js`). Tests should import schemas from `lib/validation/autopilot/preview.ts` to avoid divergence. Metrics expectations: preview call counts, error codes, distribution of `state`/`rewardStrength`, bucket-pressure incidence, and latency histograms.

## 14. Constraints and Guardrails
- Advisory-only: no payment rails, no card/proxy semantics, no bucket/session mutation on preview.
- Engine source of truth: `lib/engine/public.getAutopilotDecisionForUserSwipe` and solver; no forked logic in UI/adapter.
- UI purity: `AutopilotShell`, `AutopilotPurchaseForm`, `AutopilotDecisionPanel`, `AutopilotMonthImpactBar` must remain render-only; all mapping stays in the adapter or backend.
- Legal identity: obey `docs/cherry-vision.md` and `docs/legal-constraints.md` (copilot, not a card/terminal).

## 15. Known Gaps / Technical Debt
- Preview still lacks rate limiting and explicit response versioning; adapter/backend currently rely on the implicit v1 response contract.
- Commit migration to the shared confirm pipeline (see §17) is not implemented; current code still uses transitional bucket-mutating commit and lacks session/ledger linkage, creating double-counting risk until migration completes.
- Autopilot commit v2 is feature-flagged (`AUTOPILOT_COMMIT_V2`) and requires applying migration `20251206090000_autopilot_commit_v2` (adds `engineDecisionId`, `RecommendationSource.AUTOPILOT`, `AutopilotCommit`) before rollout.
- Reason codes/warnings are limited; richer constraint tagging from the solver would improve UI messaging without adding UI logic.
- Engine constraint tags are not surfaced to UI; warnings are coarse and not differentiated (safety vs soft advice).
- Preview/adapter ignore multi-action decisions (delay, reject, paydown) even though the solver can generate them; only card actions are surfaced.
- No contract yet for distinguishing “safety warnings” (guardrail-related) vs “soft advice” (preference/rewards nudges); UI treats all warnings uniformly.
- Temporary dual behavior may exist behind an `AUTOPILOT_COMMIT_V2`-style flag during migration; legacy commit behavior must be clearly marked and removed once Phase 3 rolls out.

## 16. Spec Enforcement Rules
- Any Autopilot-related PR must reference the spec section being updated; spec diffs must accompany behavior changes.
- Invariants in “Autopilot Invariants” and “AutopilotSimulationResult Field Contract” are mandatory; violating them is forbidden without prior spec update and explicit guardrail review.
- Future Autopilot behavior changes (backend, adapter, or UI) must first update this spec, then implement; no changes may bypass advisory-only/legal guardrails from `AGENTS.md`.

## 17. Phase 3 — Autopilot commit re-spec (target)
- Goal: Replace transitional `/api/autopilot/commit` bucket mutations with the unified confirm pipeline used by `/api/sessions/confirm`, keeping Autopilot advisory-only while recording user confirmation.
- Flow (target): UI confirms → `/api/autopilot/commit` re-evaluates via `evaluateAutopilot`, validates `decisionId`/`cardId`/`status=ok`, resolves category, finds or creates `RecommendationSession (source='AUTOPILOT', engineDecisionId=decisionId)`, invokes shared confirm pipeline (buckets + `CherryPointLedger`), persists an idempotent commit artifact linked to `decisionId`/`sessionId`, and returns `{ decisionId, sessionId, status: created|already_exists, bucket? }`.
- Errors: `{ error, code }` parity with preview plus commit-specific codes (`DECISION_MISMATCH`, `DECISION_BLOCKED`, `CARD_MISMATCH`, `COMMIT_INVARIANT_VIOLATION`), honoring `ENGINE_TIMEOUT`/`ENGINE_ERROR`.
- Invariants: no direct bucket math in Autopilot commit; all bucket/ledger effects flow through the shared confirm service; `(userId, decisionId)` governs idempotency across sessions/ledger/artifacts; advisory-only (no payment rails).
- Migration: add/align confirm service if needed; refactor `commitAutopilotDecision` to reuse it; add `RecommendationSession.source = 'AUTOPILOT'` if missing; feature-flag rollout (`AUTOPILOT_COMMIT_V2`), backfill/mark legacy `simulatedTransaction` rows, and remove V1 paths after rollout.

## Future/Target behavior (explicitly speculative)
- Full Phase 3 commit integration with shared confirm pipeline and session/ledger alignment.

## Related docs
- `docs/autopilot-engine-adapter.md`
- `docs/autopilot-integration-summary.md`
- `docs/legal-constraints.md`
