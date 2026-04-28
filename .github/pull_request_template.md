Status: Active
Last updated: 2026-04-28

# Pull Request Checklist

## Current behavior
- Use this template for all PRs to ensure CI and guardrails are respected.

## Summary

- 

## Testing

- [ ] Not run (explain why)
- [ ] Targeted proof for changed surface:
- [ ] `CHERRY_TMP_ROOT="$HOME/.cherry-tmp" CHERRY_VINE_SIGNATURE_MODE=enforce npm run verify:repo-closure`
- [ ] `npm run test:db` (only for DB/env changes)

## Engine Impact

- [ ] This PR does **not** modify engine behavior (no changes under lib/engine, lib/vine, engine APIs, or engine-adjacent files).
- [ ] This PR **does** modify engine behavior and is allowed because:
  - Reason:
  - Linked justification in `docs/engine-roadmap.md`:

During an active engine freeze, engine-changing PRs are prohibited unless explicitly whitelisted in `docs/engine-roadmap.md`. CI enforces this via `check:engine-freeze`.

## Future/Target behavior
- If CI entrypoints change, update this checklist to match.

## Related docs
- `CONTRIBUTING.md`
- `docs/ci-and-guardrails.md`
- `docs/engine-roadmap.md`
