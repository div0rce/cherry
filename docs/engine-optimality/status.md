Status: Active
Last updated: 2026-04-28

# Engine Optimality Status

## Current behavior

Cherry evaluates a bounded generated candidate set with deterministic heuristic ranking. It does not prove global optimality over all possible financial actions.

Live candidate ranking uses `objectiveUtilityCents` with serialized unit label
`utility_usd_cents`. This is a bounded heuristic objective expressed in one
canonical unit, not a true global utility function.

### Proven (bounded)

- Bounded exact optimality is proven for `(objective_v1, candidates_v1)` under
  the bounds **B** defined in `tests/engine/optimality/exhaustive.optimality.spec.ts`.
- Admissibility equivalence is enforced by
  `tests/engine/optimality/admissibility-equivalence.spec.ts`.

### Not proven

- Global optimality outside the bounded candidate space.
- Real-world preference correctness or reward accuracy.
- Completeness outside the tested bounds **B**.

### Live solver surface cap

- `maxCandidates`, when provided, caps the surfaced ranked candidates in returned decisions and trace output.
- `maxCandidates` does not cap the evaluated candidate set before scoring.

### Trace schema

- `docs/engine-optimality/trace.md`

## Future/Target behavior

- Extend bounds coverage only by adding new versioned scenarios.

## Related docs

- `docs/engine-optimality/objective.md`
- `docs/engine-optimality/candidate-space.md`
- `docs/engine-optimality/trace.md`
- `docs/simulation/objective-semantics.md`
