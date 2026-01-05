Status: Active
Last updated: 2026-01-02

# Pull Request Checklist

## Current behavior
- Use this template for all PRs to ensure CI and guardrails are respected.

## Summary

- 

## Testing

- [ ] Not run (explain why)
- [ ] `npm run check`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run ci:verify`

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
