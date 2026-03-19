Status: Active
Last updated: 2026-01-18

# Engine Optimality Objective

## Current behavior

### Definitions

- **D (Candidate space)**: The bounded candidate set defined by
  `enumerateCandidatesBounded` in `lib/engine/optimality/candidates.ts` and
  described in `docs/engine-optimality/candidate-space.md`.
- **C (Admissibility)**: `isAdmissible` in `lib/engine/optimality/admissible.ts`.
  This is a read-only wrapper over the engine constraint evaluation and hard
  constraint enforcement.
- **U (Objective vector)**: `scoreVector` in `lib/engine/optimality/objective.ts`.

### Objective vector U

`ObjectiveVector` is an ordered pair:

1. `scoreKey`: order-preserving hex encoding of the engine score.
2. `candidateKey`: canonical key from `lib/engine/optimality/normalize.ts`.

The vector is total for all finite scores and uses only stable strings.

The underlying scalar score that feeds this vector is bounded heuristic scoring, not a claim of economic optimality. Live dimensions are limited to `rewards`, `runway`, and `debtRelief`, and raw issuer points are not treated as monetary value unless runtime truth provides an explicit valuation.

### Ordering and tie-break

Ordering is strict lexicographic:

1. Higher `scoreKey` is better.
2. If equal, lower `candidateKey` is better.
The tie-break is total and deterministic because `candidateKey` is canonical
and injective.

### Determinism and totality invariants

- `scoreVector` is pure and deterministic for fixed `(candidate, state, ctx)`.
- `compareObjective` is total and stable across platforms.
- No floats are stored in `ObjectiveVector`.

### Objective versioning contract

- `objectiveVersion` is `objective_v1`.
- Any change to vector semantics, ordering, or tie-break must bump
  `objectiveVersion` and update the tests in `tests/engine/optimality`.
- Any change to `candidateKey` format or ordering requires bumping both
  `objectiveVersion` and `candidateSpaceVersion`.

## Future/Target behavior

- Add additional objective versions only with explicit migration notes.

## Related docs

- `docs/engine-optimality/candidate-space.md`
- `docs/engine-optimality/status.md`
- `docs/engine-optimality/trace.md`
