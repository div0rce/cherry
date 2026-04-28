Status: Active
Last updated: 2026-04-28

# Objective Semantics

## Current behavior

### Canonical unit

Cherry scores live candidates as `objectiveUtilityCents`.

Canonical unit: utility-adjusted USD cents.
Serialized unit label: `utility_usd_cents`.

Legacy `score` is a compatibility alias for `objectiveUtilityCents`; both values
must come from the same computation.

### Reward value

Cashback reward value enters the objective at face value in cents.

Issuer reward points are converted through `REWARD_POINT_VALUE_CENTS`. The
current live mapping is 1 point = 1 utility-adjusted cent. Raw points do not
enter objective math directly.

### Weighted component semantics

Component `utilityCents` values are final objective contributions after
configured preference weights. They should not be interpreted as literal market
cash value.

### Cash benefit

Cash-denominated benefits enter the objective through cent-denominated
conversion before profile weighting.

### Debt relief

Debt relief enters as a bounded utility-adjusted contribution. Utilization
relief is converted with
`UTILIZATION_RELIEF_UTILITY_CENTS_PER_BASIS_POINT`; balance relief is converted
from debt cents with an explicit utility mapping. These constants make the
heuristic objective interpretable without claiming that the result is literal
market cash value.

The current debt-relief constants are intentionally conservative. Debt relief is
allowed to influence ranking, especially under debt-focused profile weights, but
it is not treated as face-value cash benefit.

### Liquidity pressure

Liquidity and affordability pressure are bounded non-utility heuristic
contributions. They discourage fragile near-term liquidity outcomes and are
reported as bounded heuristic components in `scoreComponents`.

### Final interpretation

Cherry uses a bounded heuristic objective expressed in one canonical unit. It
does not define a true global utility function.

Cherry does not claim long-horizon global optimality. It ranks the currently generated candidate set under a documented, unit-consistent objective.

## Future/Target behavior

- Any new score dimension must either convert into `objectiveUtilityCents` or be
  explicitly documented as a bounded non-utility heuristic contribution.
- Any change to live objective semantics must update this document, tests, and
  engine behavior versioning.

## Related docs

- `docs/engine-optimality/objective.md`
- `docs/engine-optimality/status.md`
- `docs/engine-optimality/candidate-space.md`
