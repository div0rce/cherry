Status: Deprecated
Last updated: 2026-01-02

# Typed ESLint Postmortem (Historical)

This is a historical postmortem kept for context. It is not an active contract.

## Current behavior
- Lint and typecheck boundaries are enforced via tsconfig and guardrails; see `docs/ci-and-guardrails.md`.

## Summary
- Problem: typed ESLint surfaced files outside its TS program.
- Root cause: lint scope diverged from TSConfig scope; scripts were typechecked under app semantics.
- Key insight: ESLint is correct when it reports project-boundary violations.
- Fix: introduce a TSConfig lattice (base/app/scripts/eslint) and explicit ESLint routing.
- Invariant: every linted file belongs to exactly one TS program.
- Result: editor and CI share one semantic universe with no implicit assumptions.

## Future/Target behavior
- None. This remains a historical record.

## Related docs
- `docs/ci-and-guardrails.md`
- `docs/guardrails.md`
