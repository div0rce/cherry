Status: Active
Last updated: 2026-01-29

# Engine Freeze

## Current
- Policy schema is closed-world; only enforcement keys live in `scripts/guardrails/engine-freeze.policy.json`.
- Baseline commit (historical): `94bdefb57e654e6a07cff6532f63399bfa9d7b3d`.
- Contract:
  - ranked: true
  - deterministic: true
  - accountingSafe: true
  - unsafeDecisionsForbidden: true
  - outputType: EngineDecisionWithAccounting[]
- EngineInput snapshot (historical):
  - version: engine_input_v1
  - fixtureHash: 5c5ed72dac56661397e21505a4741ad8137d7011fd13e2a701e1ee1790e65ef3
  - fixtures:
    - tests/fixtures/engine-input/amount-zero.json
    - tests/fixtures/engine-input/basic.json

## Future
- Replace placeholder engine fixtures with real replay traces.

## Related docs
- docs/guardrails.md
- docs/doctrine.md
- docs/engine-roadmap.md
- docs/engine-ledger-boundary.md
