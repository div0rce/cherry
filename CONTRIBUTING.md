Status: Active
Last updated: 2026-09-22

# Contributing to Cherry

Operating rules for everyone (humans and agents) are in `AGENTS.md`: bootstrap, verification levels, branch and PR flow, hard invariants. This file adds only the human-workflow details not covered there.

## Branch naming
- `feat/<short-description>` for new features.
- `fix/<short-description>` for bug fixes.
- `chore/<short-description>` for maintenance and refactors.
- `docs/<short-description>` for documentation-only changes.

## Main branch and CI
- `main` must stay green under `npm run ci:verify`; `.github/workflows/ci.yml` runs it on every push and PR.
- If CI is red on `main`, no new feature work lands until it is green again. Fixes that restore green are focused and add no features.
- Route and surface placement follows `docs/information-architecture.md` and `docs/routes-map.md`; keep pages under `app/(user)`, `app/(dev)`, or `app/api`.

## Engine changes and the freeze
`docs/engine-roadmap.md` holds the freeze status (ACTIVE) and exception log. While the freeze is active, PRs that change engine semantics under `lib/engine/**`, `lib/vine/**`, `lib/scan-types.ts`, `lib/engine-invariants.ts`, or the engine-facing routes (`app/api/{simulate,simulations,vine,autopilot}/**`) need a dated exception entry there. Any engine PR:
- applies the `engine-change` label;
- follows the version-bump and `chore(engine-freeze)` commit protocol in `docs/doctrine.md` and `docs/architecture/engine-rules.md`.

## History
- Never rewrite shared history (`git push --force`, `git reset --hard` on shared branches).
- Never discard someone else's working-tree changes.

## Related docs
- `AGENTS.md`, `docs/ci-and-guardrails.md`, `docs/engine-roadmap.md`, `docs/architecture/index.md`
