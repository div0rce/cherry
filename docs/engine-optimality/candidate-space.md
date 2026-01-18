Status: Active
Last updated: 2026-01-18

# Engine Optimality Candidate Space

## Current behavior

### Candidate space R(B) (bounded)

`R(B)` is the representable candidate set defined purely by the bounds axes for
`B`. It is the cartesian product of the per-action axes described below, plus
`REJECT_PURCHASE` when enabled.

### Action types and axes

Each action type has explicit parameter axes bounded by `Bounds`:

- **USE_CARD**
  - `cardId`: `bounds.useCard.cardIds`
- **USE_CARD_WITH_PAYDOWN**
  - `cardId`: `bounds.useCardWithPaydown.cardIds`
  - `debtId`: `bounds.useCardWithPaydown.debtIds`
  - `paydownAmountCents`: `bounds.useCardWithPaydown.paydownAmountCents`
  - `paydownScheduledDateMs`: `bounds.useCardWithPaydown.paydownScheduledDateMs`
- **PAY_DOWN_DEBT**
  - `debtId`: `bounds.payDownDebt.debtIds`
  - `paydownAmountCents`: `bounds.payDownDebt.paydownAmountCents`
  - `paydownScheduledDateMs`: `bounds.payDownDebt.paydownScheduledDateMs`
- **DELAY_PURCHASE**
  - `delayDays`: `bounds.delayPurchase.delayDays`
- **SWITCH_MERCHANT**
  - `altMerchantName`: `bounds.switchMerchant.altMerchantNames`
  - `altMerchantCategoryKey`: `bounds.switchMerchant.altMerchantCategoryKeys`
- **REJECT_PURCHASE**
  - Enabled when `bounds.rejectPurchase.enabled` is true.

### Completeness Lemma (Bounded)

For fixed bounds **B** and `(s, x)`:

```
set(enumerateCandidatesBounded(s, x, B))
  = R(B)
```

No claim is made outside **B**.

### Canonical identity

- `candidateKey` (`lib/engine/optimality/normalize.ts`) is the canonical,
  injective serialization of candidate axes.
- `candidateKey` is used for deduplication, trace identity, and tie-breaks.
- Any change to `candidateKey` format or axis ordering must bump
  `candidateSpaceVersion` and `objectiveVersion`, and update tests.

### Candidate space versioning

- `candidateSpaceVersion` is `candidates_v1`.
- Any change to candidate axes or enumeration rules must bump
  `candidateSpaceVersion` and update the tests in `tests/engine/optimality`.

## Future/Target behavior

- Add new candidate-space versions only with explicit bounds migration notes.

## Related docs

- `docs/engine-optimality/objective.md`
- `docs/engine-optimality/status.md`
