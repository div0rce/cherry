Status: Active
Last updated: 2026-01-18

# Engine Optimality Status

## Current behavior

### Proven (bounded)

- Bounded exact optimality is proven for `(objective_v1, candidates_v1)` under
  the bounds **B** defined in `tests/engine/optimality/exhaustive.optimality.spec.ts`.
- Admissibility equivalence is enforced by
  `tests/engine/optimality/admissibility-equivalence.spec.ts`.

### Not proven

- Global optimality outside the bounded candidate space.
- Real-world preference correctness or reward accuracy.
- Completeness outside the tested bounds **B**.

### Trace schema

- `docs/engine-optimality/trace.md`

## Future/Target behavior

- Extend bounds coverage only by adding new versioned scenarios.

## Related docs

- `docs/engine-optimality/objective.md`
- `docs/engine-optimality/candidate-space.md`
- `docs/engine-optimality/trace.md`
