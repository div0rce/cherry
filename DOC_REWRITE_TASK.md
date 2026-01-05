Status: Active
Last updated: 2026-01-03

# Doc Rewrite Task — Cherry

This file is a temporary working spec for aligning all non-fixture documentation with code reality and guardrails. It exists to keep the rewrite orderly and verifiable.

## Current behavior
- This document guides the in-repo documentation rewrite effort and is not a product contract.

## Comprehension Gates (must pass before edits)
1. `npm ci`
2. `npm run check`
3. `npm test`
4. `npm run build`
5. `npm run ci:verify`

If any step fails, document the failure mode and stop doc edits until understood.

## Update Order
### Phase 1 — Contracts First
1. `docs/legal-constraints.md`
2. `docs/cherry-vision.md`
3. `docs/ci-and-guardrails.md`
4. `docs/guardrails.md`
5. `docs/script-standards.md`
6. `docs/repo-structure.md`
7. `docs/routes-map.md` + `docs/api.md`
8. `AGENTS.md`
9. `.github/copilot-instructions.md`
10. `README.md`

### Phase 2 — Subsystems
- Vine: `docs/cherry-vine.md`
- Wallet: `docs/wallet-pass.md`
- Verification: `docs/verification-flow.md`
- Evaluator + Autopilot + Daily state + other subsystem docs

### Phase 3 — Meta Docs
- Plans, postmortems, audits, roadmaps, marketing drafts.
- Mark Draft/Deprecated explicitly as needed.

### Phase 4 — Root Docs
- `CONTRIBUTING.md`, `.github/pull_request_template.md`, `AUDIT.md`, `types/compat/README.md`

## Exclusions
- Do not edit markdown under `tests/fixtures/**` unless updating the related test logic intentionally.

## Definition of Done
- All comprehension gates passed.
- Every non-fixture `.md` has:
  - `Status` and `Last updated` header.
  - Clear **Current behavior** vs **Future/Target behavior** where behavior is described.
  - “Related docs” section.
- No doc claim contradicts code, CI workflows, guardrails, or legal constraints.
- `AGENTS.md`, Copilot instructions, and `README.md` are aligned.
- Post-change validation: `npm run check`, `npm test`, `npm run build`.
- `git diff --name-only | rg "\\.md$"` shows intended scope only.

## Future/Target behavior
- Remove or archive this file once the doc rewrite is complete.

## Related docs
- `AGENTS.md`
- `docs/system-overview.md`
