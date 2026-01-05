Status: Draft
Last updated: 2026-01-03

# Engine Roadmap

## Current behavior
- Freeze status: ACTIVE
- There is no automated enforcement of an engine feature freeze; this is a policy note only.

## Engine Freeze Policy (policy)
Cherry is currently under an engine feature freeze.

The freeze lifts only when all of the following are true:
- Autopilot v1 is live at `/app`.
- History and buckets surfaces are refactored onto the Cherry design system.
- Recent Autopilot decisions are visible in a history/retention loop.

While the freeze is active:
- No new action types.
- No new guardrail classes.
- No new objective terms.
- No new engine-side decision dimensions.
- No semantic changes to existing actions, guardrails, or objective scoring behavior (renaming, reweighting, reinterpretation counts as a change).

Any exception must be added here as a dated bullet with a short justification.

## Freeze Authority & Exceptions

During the engine freeze:
- Any change touching engine action enums, guardrail classes, objective terms, or decision dimensions requires explicit review.
- Review authority: repo owner (or designated engine owner).
- Approval must include:
  - a dated exception entry in this document
  - a link to the PR
  - a one-line justification

## Future/Target behavior
- Add a CI guardrail that fails if:
  - `EngineActionType`
  - `GuardrailKind`
  - `ObjectiveTerm`
  - engine decision dimension enums
  change without a matching entry in this document.
- Enforcement location: `check:guardrails-core`.
- Mechanism: enum snapshot hashing or AST diff against allowlist.

## Related docs
- `docs/cherry-vision.md`
- `docs/guardrails.md`
