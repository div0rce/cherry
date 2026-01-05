Status: Active
Last updated: 2026-01-03

# Autopilot Integration Summary

## Current behavior (enforced / in code)
- **Engine location:** `lib/engine/public.getAutopilotDecisionForUserSwipe` (solver via `safeSolveDecisionForUser`; guardrails documented in `AGENTS.md`).
- **Backend routes:** `/api/autopilot/preview` (advisory fetch for UI) and `/api/autopilot/commit` (transitional: re-evaluates, enforces fingerprint/idempotency, writes a `simulatedTransaction`, and **may mutate bucket state** when the engine provides a bucket delta; no `RecommendationSession` or ledger rows today). Commit must never be exposed to end users and must not be used as a substitute for sessions/ledger-based state transitions. Both require auth via `resolveUserContext`.
- **Service and validation:** `/api/autopilot/preview` now flows through `lib/autopilot/service.getAutopilotPreview` and validates both input and output with `lib/validation/autopilot/preview.ts` (single source for schemas; route re-validates before responding).
- **Reliability/observability:** Preview route enforces structured error codes (`INVALID_PAYLOAD`, `UNAUTHORIZED`, `ENGINE_ERROR`, `ENGINE_TIMEOUT`, `PREVIEW_UNEXPECTED_ERROR`), wraps engine calls with a timeout, and emits metrics for request counts/status breakdown, bucket pressure/warnings, and route/service latency.
- **Adapter:** `lib/autopilot/runSimulation.ts` calls `/api/autopilot/preview` with `{ merchant, amountCents, occurredAt, category }`, re-validates the response with `AutopilotPreviewOutputSchema`, and adapts it into `AutopilotSimulationResult`.
- **UI contract:** `AutopilotSimulationResult` remains the sole renderer input for `AutopilotDecisionPanel`; UI components stay pure (no business logic in `AutopilotShell`, `AutopilotPurchaseForm`, `AutopilotDecisionPanel`, `AutopilotMonthImpactBar`).
- **State semantics:** `state = warning` when preview status is non-OK, warnings exist, or bucket remaining ≤ 0; safety badges and risk banners are derived from that flag. Autopilot state is a UI posture only and must not be interpreted as an authority verdict or enforcement signal. Reward strength is derived from expected benefit ratio; impact segments always padded to 3 entries.
- **Auth and guardrails:** Requests include `credentials: "include"` and respect identity/legal constraints (copilot only, no payment action). Errors surface as user-friendly copy while keeping buckets/cards untouched.
- **What to show/hide:** If the preview response is invalid or non-200, `runSimulation` throws with an `errorTimestamp`; `AutopilotShell` already surfaces `simulationError` and keeps the last successful result visible. Do not add copy or business logic to UI components—extend the adapter if semantics change. Commit is **out of scope for Phase 1**; the UI does not expose it. Use `/api/autopilot/commit` only in controlled tests until the Phase 3 commit spec is finalized.
- **Key shapes to remember:** Input `AutopilotPurchaseSummary { amount, merchant, category, timing }`; output `AutopilotSimulationResult` requires reward strength (1–4), exactly 3 `impactSegments`, badge classes, CTAs, and optional `riskBanner`. See `docs/autopilot-engine-adapter.md` for the full field mapping.
- **Zero-context onboarding (for AI agents):**
  1. Cherry is a spending copilot (not a card, not payment rails); keep advisory-only framing (see `docs/cherry-vision.md`, `docs/legal-constraints.md`).
  2. UI entry: `app/(user)/app/autopilot/page.tsx` → `AutopilotShell` → `runSimulation` → `AutopilotDecisionPanel`.
  3. Backend entry: `/api/autopilot/preview` (validated by `AutopilotPreviewOutputSchema`); solver entry `lib/engine/public.getAutopilotDecisionForUserSwipe`.
  4. Adapter source of truth: `lib/autopilot/runSimulation.ts` (do not move logic into components).
  5. Contract doc: `docs/autopilot-engine-adapter.md` (keep it in sync if fields change).
  6. Validation: run `npm test` (includes `tests/autopilot-runSimulation.test.js`) to ensure mapping stays intact.

## Future/Target behavior (explicitly speculative)
- Tighten commit semantics and document Phase 3 behavior before enabling user-facing commit flows.

## Related docs
- `docs/autopilot-engine-adapter.md`
- `docs/autopilot-master-spec.md`
- `docs/legal-constraints.md`
