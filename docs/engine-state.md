Status: Active
Last updated: 2026-03-19

# Engine State Truth Contract

Cherry may run the engine with missing financial primitives. Cherry must not present those missing primitives as known runtime state.

## Current behavior
- The runtime engine-state adapter is the single truth boundary for advisory inputs.
- Runtime state now exposes a machine-readable `capabilities` map that states whether these primitives are available:
  - `essentiality`
  - `debt`
  - `liquidCash`
  - `utilization`
- Engine results now expose machine-readable `degraded` dimensions that state which reasoning areas are no longer trustworthy:
  - `essentialProtection`
  - `debtPressure`
  - `liquidity`
  - `utilization`
- `/api/scan` and `/api/sessions` return both `capabilities` and `degraded` at the top level.

## Live advisory truth requirements
Cherry can only claim full live advisory truth for a reasoning dimension when the runtime state actually includes the primitive that dimension depends on.

Required primitives:
- Bucket essentiality for essential protection and runway guarantees
- Debt state for debt-pressure and debt-prioritization logic
- Liquid cash state for liquidity and safe-to-spend logic
- Utilization inputs for utilization constraints and credit-pressure adjustments

If a required primitive is unavailable:
- the engine may still return a decision
- the affected reasoning dimension must be marked degraded
- the runtime must not silently replace the primitive with a safe-looking default

## Current repo reality
- Bucket essentiality is not modeled as a first-class runtime primitive in schema-backed production state.
- Debt accounts are not modeled in the current production schema.
- Liquid cash is not modeled in the current production schema.
- Utilization inputs are not modeled in the current production schema.

Current runtime capability output for the Prisma-backed adapter is therefore:
- `essentiality`: unavailable (`not_modeled`)
- `debt`: unavailable (`not_modeled`)
- `liquidCash`: unavailable (`not_modeled`)
- `utilization`: unavailable (`not_modeled`)

## Rules
- `available: false` means the engine must not behave as if that primitive were safe, zero, false, or otherwise known.
- `partial` may be used only when a primitive is modeled and some truthful inputs are loaded, but not enough for full dependent reasoning.
- `partial` still requires degradation for every reasoning dimension that depends on the missing subfields.
- `Maybe.unavailable` must not carry a placeholder value.

## Related docs
- `docs/api.md`
- `docs/system-overview.md`
- `docs/cherry-vision.md`
- `AGENTS.md`
