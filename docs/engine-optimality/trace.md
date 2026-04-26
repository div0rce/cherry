Status: Active
Last updated: 2026-04-26

# Engine Optimality Trace Schema

## Current behavior

### Trace version

- `traceVersion`: `trace_v1`
- Live solver traces are single-step present-time traces. Purchase effects are authorization effects, not posted settlement effects. The live solver is not a generic future scheduler. Future scheduled paydowns are retained as raw timing input but do not mutate present ranking state.
- Only already-effective scheduled paydowns with `effectiveAtMs <= decisionTimeMs` can affect present traces.
- Future scheduled paydowns with `effectiveAtMs > decisionTimeMs` are raw timing inputs for future surfaces only.
- Trace consumers must not infer posting, reversal, cancellation, settlement, or lifecycle replay from trace fields.
- PR8.3 exclusion-driven degradation is currently computed from the surface-filtered generated set before hard filtering and before score sorting. That is intentional temporary coupling to pre-PR9 truncation behavior: it means “credit actions were generated for this surface and excluded because the credit liability was not fully resolvable,” not “credit would have survived final live pre-PR9 slicing.”

### JSON schema (informal)

```json
{
  "traceVersion": "trace_v1",
  "objectiveVersion": "objective_v1",
  "candidateSpaceVersion": "candidates_v1",
  "scenario": "string",
  "bounds": {
    "useCard": { "cardIds": ["string|null"] },
    "useCardWithPaydown": {
      "cardIds": ["string|null"],
      "debtIds": ["string|null"],
      "paydownAmountCents": ["number|null"],
      "paydownScheduledDateMs": ["number|null"]
    },
    "payDownDebt": {
      "debtIds": ["string|null"],
      "paydownAmountCents": ["number|null"],
      "paydownScheduledDateMs": ["number|null"]
    },
    "delayPurchase": { "delayDays": ["number|null"] },
    "switchMerchant": {
      "altMerchantNames": ["string|null"],
      "altMerchantCategoryKeys": ["string|null"]
    },
    "rejectPurchase": { "enabled": "boolean" }
  },
  "engine": {
    "candidate": "Candidate|null",
    "key": "string|null",
    "vector": "ObjectiveVector|null"
  },
  "oracle": {
    "candidate": "Candidate|null",
    "key": "string|null",
    "vector": "ObjectiveVector|null"
  },
  "topK": ["TraceCandidate"],
  "zeroAdmissible": "boolean"
}
```

### Candidate

```json
{
  "type": "USE_CARD | USE_CARD_WITH_PAYDOWN | PAY_DOWN_DEBT | DELAY_PURCHASE | SWITCH_MERCHANT | REJECT_PURCHASE",
  "...": "axis fields per action type"
}
```

### ObjectiveVector

```json
{
  "scoreKey": "string",
  "candidateKey": "string"
}
```

### TraceCandidate

```json
{
  "candidate": "Candidate",
  "key": "string",
  "vector": "ObjectiveVector"
}
```

## Future/Target behavior

- Extend the schema only via a new `trace_vN` version.
- `paydownScheduledDateMs` remains a legacy input axis only. Present-vs-future semantics are decided during simulation normalization, not by trace consumers.

## Related docs

- `docs/engine-optimality/objective.md`
- `docs/engine-optimality/candidate-space.md`
- `docs/engine-optimality/status.md`
