Status: Active  
Last updated: 2025-12-02

# Contributing to Cherry

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
  - Operate only on `main`.
  - Must not create branches.
  - Must not rewrite history (`git reset --hard`, `git push --force`).
  - May only perform small, atomic tasks that can be fully completed and committed in 1–2 commits.
  - Must start from a clean working tree (no untracked, staged, or unstaged changes).

- **CI**
  - Enforces that `main` stays green by running linting, typechecking, and tests on every push and pull request.

### Branch Naming

- `feat/<short-description>` for new features.
- `fix/<short-description>` for bug fixes.
- `chore/<short-description>` for maintenance and refactors.

### Main Branch and CI Rules

- `main` must always pass:
  - `npm run lint && npm run typecheck:scripts && npm run typecheck && npm run test`
- Pull requests into `main` may only be merged after CI passes.
- If CI is red on `main`, no new feature work is allowed until `main` is green again.
- Fixes to restore green must be done in focused changes that only repair CI, not introduce new features.

## AI Agent Preconditions

Before any AI agent runs on this repository:

- The current branch must be `main`.
- `git status --porcelain` must be completely empty (no untracked files, no staged changes, no unstaged changes).
- The agent's task must be small and bounded (1–2 commits).
- The agent must run `npm run check:clean` before any mutating operation.

If any of these conditions are not met, the agent must not proceed and must report a failed precondition instead of modifying the repository.

## Engine Changes and Freeze Policy

See `docs/engine-roadmap.md` for current engine freeze status.

While the freeze is active:
- PRs that change engine semantics under `lib/engine/**`, `lib/engine.ts`, `lib/engine/legacy.ts`, `lib/vine/**`, `lib/scan-types.ts`, `lib/engine-invariants.ts`, or engine APIs in `app/api/simulate/**`, `app/api/simulations/**`, `app/api/vine/**`, and `app/api/autopilot/**` are forbidden except documented emergency bugfix exceptions listed in `docs/engine-roadmap.md`.

Any PR that touches engine code:
- Must apply the `engine-change` label.
- Must include a link to the corresponding exception entry in `docs/engine-roadmap.md` when opened during a freeze.
