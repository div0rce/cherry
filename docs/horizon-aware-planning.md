Status: Current
Last updated: 2026-04-29

# Horizon-Aware Planning

Cherry has two separate decision concepts: single-step recommendation and
horizon-aware planning. PR11 adds only the planning primitive.

## Single-Step Recommendation

A single-step recommendation answers:

> What action should be recommended now, using present-state facts?

This remains the default recommendation surface. PR11 does not change solver
output, API routes, or UI behavior.

## Horizon-Aware Planning

A horizon-aware rollout answers:

> If Cherry repeatedly applied an injected policy over a short explicit horizon,
> what projected state sequence would result?

The rollout is deterministic planning infrastructure. Its serialized label is
`planning_projection`, and every rollout step is also labeled
`planning_projection`.

Step 0 is marked with `stepRole: "selected_present_action"` because it is the
present action selected by the planning policy. Later steps use
`stepRole: "projected_future_action"` and describe projected policy behavior
only.

## Non-Leakage Rule

Future projected events may not justify a present-time recommendation in PR11.

By default and by design:

```txt
futureJustification = "forbidden"
```

The selected present action is only the step-0 policy action. Future projected
steps can affect only the projected state sequence inside the rollout.

Rollout step states are recorded as snapshots. Callers may inject custom
snapshot behavior for non-plain state, canonical serialization, frozen fixtures,
or class-like objects. The rollout loop still advances with the actual
transition result.

## Current Scope

This is not full financial planning.
This is not stochastic modeling.
This is not obligation forecasting.
This is not a UI redesign.

The horizon subsystem is generic. It accepts injected policy and transition
functions and does not import solver internals.

## Expected-Value Overlay

PR12 adds a separate expected-value wrapper for horizon rollout. Deterministic
`runHorizonRollout` remains the base primitive.

Expected-value rollout samples labeled numeric uncertainty before each
deterministic rollout, then aggregates utility in `utility_usd_cents` through an
explicit utility extractor. Transition functions still receive concrete state,
not distributions.

Expected-value output is labeled as expectation. It must not be described as a
guaranteed future outcome.

## Related docs

- `docs/engine-time-semantics.md`
- `docs/engine-optimality/trace.md`
- `docs/simulation/objective-semantics.md`
- `docs/simulation/uncertainty-modeling.md`
