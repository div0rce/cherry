Status: Active
Last updated: 2026-01-18

# Engine Optimality Trace Schema

## Current behavior

### Trace version

- `traceVersion`: `trace_v1`

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

## Related docs

- `docs/engine-optimality/objective.md`
- `docs/engine-optimality/candidate-space.md`
- `docs/engine-optimality/status.md`
