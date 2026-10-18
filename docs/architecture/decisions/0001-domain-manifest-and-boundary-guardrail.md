Status: Accepted
Last updated: 2026-09-22

# ADR 0001 — Domain manifest and dependency-direction guardrail

## Context
Cherry had strong point guardrails (engine: no Prisma, no Date; guardrails: no runtime imports; shells: no cross-imports) but no statement of which module owns which file or which direction imports may flow between capabilities. Agents had to read most of `lib/` to find a change's home, and cross-domain coupling (e.g. `lib/engine.ts` transitively loading Prisma, schemas importing services) was invisible.

## Decision
- Add `scripts/guardrails/domains.manifest.json`: 24 domains in 4 layers, each with `owns` globs, `mayImport`, `tests`, `docs`, `invariants`.
- Add `check:domain-boundaries` (registered, part of `npm run check`) that enforces total, exclusive ownership and downward value-import direction, validates that `tests`/`docs` references resolve, and requires stale `allowedViolations` entries to be deleted.
- Pre-existing violations are allowlisted with reasons rather than fixed here, because three of them sit inside `lib/engine/**` and fall under the engine-freeze and change-isolation protocol.
- Add `report:domain-impact` (execution registry) and `--filter` on the node/next test runners so a change's DOMAIN-level verification can be derived from the manifest.

## Alternatives considered
- dependency-cruiser / eslint-plugin-boundaries: capable, but a new dependency and a second rule language; the repo already has a regex/AST guardrail idiom and a registry with meta-checks.
- Directory reorganisation into `lib/<domain>/`: high churn across ~360 files during an engine freeze; ownership by glob gives the same navigability without moving code.
- A per-domain `package.json` (monorepo): no compilation or ownership benefit at this size.

## Consequences
- New files must be owned; unowned files fail `check`. Cost: one line in the manifest.
- The manifest is the single machine-readable source for "who owns this / what may it import / what to test"; `docs/architecture/domains.md` is a rendering of it.
- Type-only imports are unchecked. This is deliberate; it can be tightened later.
