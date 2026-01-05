Status: Deprecated
Last updated: 2026-01-02

# Guardrails and Script Hygiene TODO (Historical)

This document captured a migration plan that has since been implemented in guardrails and script standards. It is kept for historical context only.

## Current behavior
- Guardrail and script hygiene rules are enforced via `scripts/guardrails/registry.mts` and documented in `docs/guardrails.md` and `docs/script-standards.md`.
- Guardrail helper exclusivity, script runner contracts, and registry completeness are enforced in CI.

## Historical plan (archived)
The sections below describe the original fixed-point migration plan. Use them only for context.

---

### Guardrails & Script Hygiene — Fixed-Point Migration (Archived)

#### Goal (archived)
Reach a fixed point where all checks pass with zero warnings and no allowlists.

#### Phases (archived)
- Make rules explicit for scripts and guardrails.
- Mechanically clean up script violations.
- Ensure guardrails obey guardrails.
- Lock the fixed point by enforcing CI entrypoints.

## Future/Target behavior
- None. This plan is complete and superseded by current guardrail docs.

## Related docs
- `docs/guardrails.md`
- `docs/script-standards.md`
- `docs/ci-and-guardrails.md`
