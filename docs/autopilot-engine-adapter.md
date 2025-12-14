Status: Active  
Last updated: 2025-12-06

# Autopilot Engine Adapter (UI ↔️ Backend)

Purpose: explain, in one place, how the Autopilot UI contract (`AutopilotSimulationResult`) is filled from the real Cherry engine via `/api/autopilot/preview`. This is written for an AI agent with zero Cherry context—start here, then cross‑reference `AGENTS.md`, `docs/cherry-vision.md`, `docs/legal-constraints.md`, and `docs/api.md`. Treat this file as the adapter truth: inputs, validation, engine calls, and UI mapping all live here and must stay aligned with the code paths noted below.

Cherry guardrails you must keep in mind:
- Cherry is a spending copilot (observe → evaluate → recommend → reward). It is **not** a card/terminal/payment front.
- Autopilot is advisory only; no charges are made from the UI or this adapter.
- Wallet/Vine/payment rails are out of scope here; we only fetch a recommendation.

Repo/location primers:
- Framework: Next.js 16 App Router; TypeScript; server-first.
- UI entry: `app/(user)/app/autopilot/page.tsx` → `components/autopilot/AutopilotShell`.
- Adapter entry: `lib/autopilot/runSimulation.ts` (only place UI performs logic).
- Backend entry: `/api/autopilot/preview` (App Router route).
- Validation: `lib/validation/autopilot/preview.ts` (input + output schemas; single source).
- Service wrapper: `lib/autopilot/service.ts#getAutopilotPreview` (engine orchestration + DTO mapping).
- Engine entry: `lib/engine/public.getAutopilotDecisionForUserSwipe` (solver wrapper).

## Data flow (verbose, end-to-end)
1) UI sends `AutopilotPurchaseSummary` to `lib/autopilot/runSimulation.ts`. Summary is validated locally (amount > 0, merchant non-empty).
2) Adapter builds preview payload (merchant trimmed, `amountCents = round(amount*100)`, `occurredAt = now`, `category` mapped to `AutopilotRewardCategory`) and POSTs `/api/autopilot/preview` with credentials.
3) `/api/autopilot/preview` parses JSON through `AutopilotPreviewInputSchema` (`lib/validation/autopilot/preview.ts`), resolves user via `resolveUserContext(requireAuth: true, allowLabDemo: true)`, then calls `getAutopilotPreview` in `lib/autopilot/service.ts`.
4) Service builds the engine call context (card universe from Prisma, idempotency fingerprint, bucket lookup), invokes `getAutopilotDecisionForUserSwipe`, maps to the DTO, validates the DTO through `AutopilotPreviewOutputSchema`, and returns it (no writes).
5) Route re-validates with `AutopilotPreviewOutputSchema`, logs guardrail events on `blocked`/`fallback`, and responds 200 JSON.
6) Adapter validates the JSON again with `AutopilotPreviewOutputSchema`, maps to `AutopilotSimulationResult` (state, cards, impact bar, badges, CTAs), and hands it to the pure UI renderers.

### Semantics ownership (current and target)
- **AdapterSemantics v1 (current reality):** `lib/autopilot/runSimulation.ts` still authors user-facing strings (card labels, reward strength labels, badge copy, impact segment labels). Guardrail tests (`tests/autopilot-*-literals.test.ts`) snapshot current literals to prevent silent drift.
- **EngineSemantics v2 (target):** `/api/autopilot/preview` should return a complete UI bundle (badge labels/tones, card labels/sentences, section headers, segment labels, reward strength label, CTA labels, action note, idle/loading/error copy, timestamp fallback). When v2 exists, the adapter becomes formatting-only and the UI remains a pure renderer. Keep v1 stable until v2 is implemented and adopted.

## Shape quick reference (with validation hooks)
- **Input (UI → runSimulation):**
  ```ts
  type AutopilotPurchaseSummary = {
    amount: number;          // dollars, > 0
    merchant: string;        // required
    category: "dining" | "groceries" | "travel" | "gas" | "other";
    timing: "now" | "scheduled-soon";
  };
  ```
- **Preview request (runSimulation → backend)** — validated by `AutopilotPreviewInputSchema`:
  ```json
  {
    "merchant": "Chipotle",
    "amountCents": 2200,
    "occurredAt": "2025-12-05T05:00:00.000Z",
    "category": "DINING"
  }
  ```
- **Preview response (validated twice via `AutopilotPreviewOutputSchema`: service + route + adapter):**
  ```json
  {
    "decisionId": "decision-123",
    "merchant": "Chipotle",
    "amountCents": 2200,
    "occurredAt": "2025-12-05T05:00:00.000Z",
    "status": "ok|blocked|fallback",
    "recommendedCard": { "id": "...", "label": "...", "issuer": null, "network": null },
    "expectedBenefitCents": 120,
    "explanation": { "primary": "...", "secondary": ["..."], "warnings": ["..."] },
    "bucketImpact": { "bucketId": "...", "name": "Dining", "remainingCents": 7000, "spentCents": 13000 },
    "reasonCode": "MAX_REWARDS"
  }
  ```
- **Renderer contract (`AutopilotSimulationResult` key fields the UI expects):**
  - `state: "recommended" | "warning"`
  - `cards: SimulationCardChoice[]` (index 0 is primary)
  - `rewardStrength: 1 | 2 | 3 | 4` + `rewardStrengthLabel`
  - `impactSegments: { label; percentage; color }[]` **exactly 3 entries**
  - `impactNotes: string[]`
  - `monthImpactTitle`, `monthImpactSummary`, `monthImpact.riskNote`
  - `safetyBadgeClass`, `safetyBadgeDotClass`, `safetyBadgeLabel`
  - `ctaPrimary`, `ctaSecondary`

## Mapping (preview → AutopilotSimulationResult, verbose)
- `state`: `recommended` only when `status === "ok"` AND no warnings AND bucket has remaining > 0; otherwise `warning`.
- `cards`: index 0 is the recommended card (or “Your usual card”) with `labelTone` positive/negative by state; index 1 is a neutral “Alternate card” placeholder to keep UI loops stable even when no alternate exists.
- `rewardStrength`: derived from `expectedBenefitCents / amountCents` bands (≤1% → 1, >1% → 2, >2% → 3, >3% → 4) with `rewardStrengthLabel` (“Low”→“Strong” rewards).
- `recommendationSummary`: `explanation.primary` or fallback “Use <card>…”.
- `impactSegments`: always exactly 3; uses `bucketImpact.spentCents` + `remainingCents` when present (used vs remaining vs everything else) or padded safe defaults otherwise.
- `impactNotes`: bucket remaining note (when present) + `explanation.secondary` + `explanation.warnings`.
- `monthImpactSummary`: bucket remaining narrative + reward uplift string when `expectedBenefitCents > 0`; `monthImpact.riskNote` concatenates warnings or a safe default.
- `riskBanner`: first warning when `state === "warning"`; omitted in recommended posture.
- Safety badge: green for `recommended`, amber for `warning`; CTAs are text-only (“Use <card>…”, “View bucket impact”).

## Validation and guardrails (authoritative checkpoints)
- Input guard: `AutopilotPreviewInputSchema` enforces merchant trimmed + present, `amountCents` positive int, `occurredAt` ISO string (defaults to now in adapter), and required `category` enum. The route rejects invalid/absent JSON with `400/INVALID_PAYLOAD`.
- Engine guard: service checks userId, card universe non-empty, positive amount, and wraps engine errors with `AutopilotServiceError (500, ENGINE_ERROR)` without mutating state.
- Output guard: `AutopilotPreviewOutputSchema` is applied in the service, the route, and the adapter—three gates before UI consumption. If any gate fails, callers see a structured error; no partial payloads flow through.
- Error envelope: all non-200 responses from `/api/autopilot/preview` include `{ error, code }` (e.g., `INVALID_PAYLOAD`, `UNAUTHORIZED`, `ENGINE_TIMEOUT`, `PREVIEW_UNEXPECTED_ERROR`). The adapter reads `code` when present to classify failures but never surfaces it as UI copy.
- Adapter invariants: `impactSegments.length === 3`, `rewardStrength ∈ {1,2,3,4}`, `state` derived only from status + warnings + bucket pressure; errors include `errorTimestamp` for UI.
- Network/auth: `fetch("/api/autopilot/preview", credentials: "include")` so auth cookies are required; UI shows the simulation error banner while retaining the last good result.
- UI purity guard: no business logic in `AutopilotShell`, `AutopilotPurchaseForm`, `AutopilotDecisionPanel`, or `AutopilotMonthImpactBar`. Only `AutopilotSimulationResult` drives rendering.

## Quick start for a new agent
1) Read `AGENTS.md` → legal/identity constraints (copilot, not a card).  
2) Read this file end to end.  
3) If you change the contract, edit `lib/autopilot/runSimulation.ts` (adapter) and keep `AutopilotDecisionPanel` untouched.  
4) Keep `/api/autopilot/preview` shape in sync; update `AutopilotPreviewOutputSchema` if backend changes.  
5) Run `npm test` (includes `tests/autopilot-runSimulation.test.js`) to validate the mapping.  
6) Never move business logic into UI components; adjust the adapter or backend instead.

## Tests
- `tests/autopilot-runSimulation.test.js` covers happy-path mapping: payload sent to preview, state resolution, reward strength bounds, and 3-segment impact bar padding.
