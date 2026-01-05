Status: Active
Last updated: 2026-01-03

# Authority → UI Contract (advisory-only)

Scope: Defines how UI surfaces must consume `authority_v1` outputs. UIs are renderers, not interpreters.

## Current behavior (enforced / in code)
- Authority decisions are returned by `/api/scan`, `/api/simulate`, `/api/vine/order`, and Autopilot surfaces.
- UI must render authority outputs verbatim and avoid translating them into payment semantics.

## Contract
- Render `authority` exactly as provided: `verdict`, `severity`, `reasons[] { code, severity, detail }`, `counterfactuals[]`, `explanation`.
- Authority outputs may affect presentation only; UIs must not enable, disable, gate, or alter flows based on authority fields.
- Do **not** remap severity, invent labels, or re-rank reasons. Use the ordering provided by the engine.
- Do **not** translate advisory signals into approval/decline/route semantics. Allowed verbs: *simulate, evaluate, recommend, warn, flag*.
- Show counterfactuals verbatim (e.g., suggested amount/delay/bucket); do not alter thresholds or add local logic.
- Persisted DecisionEvents are authoritative for replay/analytics; UIs must not mutate or synthesize new events.

## Why this exists
- Prevents UI drift that reintroduces payment semantics.
- Keeps a single, deterministic source of truth for authority reasoning.
- Enables safe iteration on engine rules without breaking surfaces.

## Anti-patterns (forbidden)
- Re-labeling `FLAG_SIMULATED`/`WARN_SIMULATED` as decline/approve.
- Dropping reasons or counterfactuals because they “seem redundant”.
- Client-side severity math or “smart” thresholds.
- Creating new reason codes in UI or telemetry.

## Allowed presentation tweaks
- Copy/visual styling is allowed if it does not change meaning.
- Grouping reasons for readability is allowed **only** if all reasons remain visible and unedited.

## Future/Target behavior (explicitly speculative)
- If an `authority_v2` is introduced, update this contract with any new fields or reason codes before shipping UI changes.

## Related docs
- `docs/authority-v1.md`
- `docs/legal-constraints.md`
- `docs/api.md`
