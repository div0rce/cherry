Status: Draft
Last updated: 2025-12-29

## Registry Hardening TODOs

- [ ] Enforce alphabetical ordering of GUARDRAILS (deterministic diffs)
- [ ] Snapshot GUARDRAIL_NAMES in test to detect reorder drift
- [ ] Forbid string interpolation in registry values entirely
- [ ] Auto-generate guardrail docs from registry metadata
- [ ] Add `check:guardrail-changelog` to require rationale for additions
- [ ] Add `check:guardrail-removal` to forbid deletion without tombstone
