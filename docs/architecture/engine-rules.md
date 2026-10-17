Status: Active
Last updated: 2026-10-17

# lib/engine — scoped rules

Root contract: `../../AGENTS.md`. This lives in docs rather than `lib/engine/` because every file under `lib/engine/` is engine-sensitive for `check:engine-version-bump`. Invariants: `../../docs/doctrine.md` §1, §6, §8. This file adds only engine specifics.

## Before editing anything here
1. The engine feature freeze is ACTIVE (`docs/engine-roadmap.md`). No new action types, guardrail kinds, objective terms, or decision dimensions, and no reweighting or reinterpretation of existing ones, without a dated exception entry in that doc.
2. Any change that can affect ordering, admissibility, accounting, or candidate space needs:
   - a bump in `lib/engine/version.ts` (`engineBehaviorVersion`, `engineInputVersion`, `engineCandidateSpaceVersion`, or `engineAccountingVersion`, whichever applies);
   - a separate commit `chore(engine-freeze): ...` that updates `scripts/guardrails/engine-freeze.policy.json` (and fixture hashes) — `check:engine-version-bump` requires that commit to be the latest touching the policy;
   - the engine change itself in a commit prefixed `engine:` touching only `lib/engine/` (`check:change-isolation`, active when `CHERRY_COMMIT_MESSAGE` is set).
3. Run `npm run check:guardrails` before the full gate: `check:engine-freeze`, `check:engine-version-gates`, `check:engine-optimality`, `check:accounting-invariants`, `check:objective-semantics` all live there.

## Purity
- No `Date` anywhere in `lib/engine/`, including `input/fromLegacy.ts` (`check:engine-date` bans the token). Time is `nowMs` in the context.
- No Prisma, no `lib/prisma`, no `lib/adapters/runtime` value imports (`check:engine-prisma`, `check:domain-boundaries`). There are no exceptions: the barrel (`lib/engine.ts`) re-exports only types from `lib/legacy-engine.ts`, and Autopilot's Prisma-backed swipe entry lives in `lib/autopilot/engine-decision.ts`.
- No `??` silent defaults, no float money math (`check:repo-guardrails`). Money is integer cents; scores use `OBJECTIVE_SCORE_UNIT`.
- Never throw across the boundary from `safeSolveDecisionFor*`; return `{ ok: false, reason }`.

## Map
- `lib/engine/input/EngineInput.ts` — the only input contract (`check:engine-input-boundary`); `input/fromLegacy.ts` builds it; `input/validate.ts` is total.
- `solver.ts` — `solveDecision`, `safeSolveDecisionForUser`. `run.ts` — `safeSolveDecisionForWorld` (what routes call).
- `objective.ts`, `candidates.ts`, `guardrails.ts`, `simulate.ts`, `horizon/`, `uncertainty/`, `optimality/` — scoring, candidate space, hard constraints, rollouts, proofs.
- `legacy-mapper.ts` — maps solver decisions to the older MCC-aware engine's decision shape (its runtime is `lib/legacy-engine.ts`, imported directly by routes, never through the barrel); still consumed for response compatibility.
- Tests: `tests/node/engine*.test.*`, `tests/node/engine/**`; replay fixtures in `tests/replay/`.
