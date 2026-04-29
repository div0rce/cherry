Status: Active
Last updated: 2026-04-29

# Uncertainty Modeling

## Current behavior

Cherry's deterministic engine remains primary. PR12 adds an expected-value
overlay for simulation and horizon planning; it does not rewrite transition
functions or present-time recommendation semantics.

Uncertain inputs are numeric only. They must be represented as labeled
`UncertainNumber` values at leaf fields:

```ts
{
  incomeCents: {
    label: 'monthly_income',
    distribution: { kind: 'lognormal', mu: 8, sigma: 0.1 },
  },
}
```

Sampling happens before deterministic rollout. Transition functions receive
realized numeric state, never distributions.

## Supported distributions

The supported numeric distributions are:

- `point(value)`
- `bernoulli(p)`
- `normal(mu, sigma)`
- `lognormal(mu, sigma)`
- `discrete(values, probs)`

Distribution parameters are validated before use. Discrete probabilities must
sum to 1. Nonnegative engine domains such as cents, income, expense, balances,
limits, cash, liquid amounts, rates, and utilization reject distributions that
can produce negative samples. Use `lognormal`, nonnegative `point`, or
nonnegative `discrete` values for positive-only financial quantities.

## Expected-value rollout

Expected-value rollout is exposed separately from deterministic rollout.

```txt
runHorizonRollout(...)                -> deterministic projection
runExpectedValueHorizonRollout(...)   -> expected-value projection
```

The EV wrapper realizes uncertain state once per sample, calls deterministic
rollout, extracts utility through an explicit `utilityOfRollout` callback, and
aggregates sample utility.

Sample count is bounded:

- minimum: `100`
- default: `500`
- maximum: `5000`

Computational cost is:

```txt
O(samples * horizon * transition cost)
```

## Reproducibility

EV runs require an explicit seed. The engine uses a deterministic seeded RNG;
EV engine paths must not call `Math.random`.

Explanations include the seed and sample count so a simulation can be
reproduced when the same inputs, policy, transition, and utility extractor are
used.

## Utility and risk units

Expected utility is aggregated in `utility_usd_cents`, the same canonical unit
as `objectiveUtilityCents`.

Variance remains in utility-space. PR12 implements only variance-based risk
adjustment:

```txt
riskAdjustedUtility = expectedUtility - lambda * variance
```

`lambda` is a dimensionless risk-aversion coefficient and defaults to `0`
risk-neutral behavior.

The type surface reserves future risk metric names for semivariance and CVaR,
but those are not implemented in PR12.

## Explanation contract

Expected-value explanations must label scalars as expectations. They include:

- labeled assumptions
- distribution strings
- seed
- sample count
- expected outcome
- variance
- risk inputs
- `uncertaintyLevel`
- `results are expectations, not guarantees`

`uncertaintyLevel` is a relative volatility classification using coefficient
of variation:

```txt
cv = sqrt(variance) / abs(expectedUtility)
```

- `low`: `cv < 0.10`
- `medium`: `0.10 <= cv <= 0.30`
- `high`: `cv > 0.30`
- `unknown`: expected utility is zero or variance is missing

## Future/Target behavior

- Add downside-aware risk metrics only when the explanation and unit semantics
  are equally explicit.
- Do not use EV output in production recommendation surfaces until the model is
  bounded, explainable, and runtime-verified.

## Related docs

- `docs/horizon-aware-planning.md`
- `docs/simulation/objective-semantics.md`
- `docs/engine-optimality/objective.md`
