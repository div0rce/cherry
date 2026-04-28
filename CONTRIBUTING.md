Status: Active
Last updated: 2026-01-03

# Contributing to Cherry

## Current behavior (enforced / in code)
- CI runs `npm run ci:verify` (check + test + build) on pushes and PRs.
- Guardrails are enforced via `npm run check` and registries in `scripts/guardrails/*`.

## Information Architecture (source of truth)
- Surface placement is defined in `docs/information-architecture.md` and the canonical route list in `docs/routes-map.md`.
- Add or move routes only after updating those docs, and keep marketing, user, and dev console pages under their respective `(marketing)`, `(user)`, or `(dev)` route groups.

## Workflow and Branch Policy

### Actors

- **Human contributors**
  - May create feature branches (`feat/*`), bugfix branches (`fix/*`), and chore branches (`chore/*`).
  - Must raise pull requests into `main`.
  - Must not push directly to `origin/main`.

- **AI Agents**
  - Follow `AGENTS.md` for operational constraints.
  - Must not rewrite history (`git reset --hard`, `git push --force`).
  - Must not discard or revert existing worktree changes unless explicitly asked.

- **CI**
  - Enforces that `main` stays green by running `npm run ci:verify` on every push and pull request.

### Branch Naming

- `feat/<short-description>` for new features.
- `fix/<short-description>` for bug fixes.
- `chore/<short-description>` for maintenance and refactors.

### Main Branch and CI Rules

- `main` must pass the full gate:
  - `npm run ci:verify` (composite: check + test + build)
- If CI is red on `main`, no new feature work is allowed until `main` is green again.
- Fixes to restore green must be done in focused changes that only repair CI, not introduce new features.

## AI Agent Preconditions

Before any AI agent runs on this repository:

- Note the current branch and `git status --porcelain`; do not assume a clean worktree.
- Do not discard unrelated changes; coordinate with the user if conflicts exist.
- Keep changes scoped and justified; avoid broad refactors.

### Non-negotiable preconditions

- Agents must not treat direct commits to `main` as the normal workflow.
- The default agent workflow is:
  1. Start from updated `main`.
  2. Create a focused branch.
  3. Implement the requested change on that branch.
  4. Run the relevant verification commands.
  5. Commit the change with a clear conventional commit message.
  6. Push the branch.
  7. Open or prepare a pull request into `main`.
  8. Do not merge unless explicitly instructed.
- Canonical command flow:
  ```bash
  git checkout main
  git pull --ff-only
  git checkout -b <type>/<short-description>

  # implement changes

  git status --short
  npm run check
  npm test
  npm run build

  git add .
  git commit -m "<type>: <summary>"
  git push -u origin <type>/<short-description>
  ```
- The PR must include:
  - `## Summary` — what changed
  - `## Testing` — commands run and results
  - `## Risk` — changed domains and possible regressions
- Never commit directly to `main` unless the user explicitly says to.
- Never merge a PR unless the user explicitly says to.
- Never skip verification silently.
- If verification fails, stop and report the failure.
- If the working tree is dirty before starting, inspect it first and do not overwrite unrelated user changes.
- If a branch already exists, reuse it only if it matches the requested task; otherwise create a new branch.
- Each PR should represent one coherent change. Do not bundle unrelated fixes.
- Prefer `squash and merge` when the user later asks to merge.
- Agents must not proceed if the worktree is dirty without explicit user approval.
- Agents must keep tasks bounded (≤2 commits) and avoid broad refactors.
- If preconditions are not met, agents must stop and report the issue instead of modifying files.

## Engine Changes and Freeze Policy

See `docs/engine-roadmap.md` for current engine freeze status.

While the freeze is active:
- PRs that change engine semantics under `lib/engine/**`, `lib/engine.ts`, `lib/engine/legacy.ts`, `lib/vine/**`, `lib/scan-types.ts`, `lib/engine-invariants.ts`, or engine APIs in `app/api/simulate/**`, `app/api/simulations/**`, `app/api/vine/**`, and `app/api/autopilot/**` are forbidden except documented emergency bugfix exceptions listed in `docs/engine-roadmap.md`.

Any PR that touches engine code:
- Must apply the `engine-change` label.
- Must include a link to the corresponding exception entry in `docs/engine-roadmap.md` when opened during a freeze.

## Future/Target behavior
- Add a guardrail that enforces the engine freeze policy if it becomes more formal.

## Related docs
- `AGENTS.md`
- `docs/ci-and-guardrails.md`
- `docs/engine-roadmap.md`
