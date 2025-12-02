import type {
  BucketId,
  BucketProjection,
  CashProjection,
  DebtProjection,
  EngineAction,
  EngineContext,
  EngineState,
} from './types';

function pickBucketForContext(state: EngineState, ctx: EngineContext): BucketId | null {
  if (!ctx.merchantCategoryKey) return null;
  const candidate = state.buckets.find((b) => b.categoryKey === ctx.merchantCategoryKey);
  return candidate ? candidate.id : null;
}

function cloneBuckets(buckets: EngineState['buckets']): EngineState['buckets'] {
  return buckets.map((b) => ({ ...b }));
}

function cloneDebts(debts: EngineState['debts']): EngineState['debts'] {
  return debts.map((d) => ({ ...d }));
}

export function simulateAction(
  state: EngineState,
  ctx: EngineContext,
  action: EngineAction
): {
  buckets: BucketProjection[];
  debt: DebtProjection[];
  cash: CashProjection;
} {
  const amount = ctx.amountCents ?? 0;
  const clonedBuckets = cloneBuckets(state.buckets);
  const clonedDebts = cloneDebts(state.debts);

  switch (action.type) {
    case 'USE_CARD': {
      const bucketId = pickBucketForContext(state, ctx);
      if (bucketId) {
        const bucket = clonedBuckets.find((b) => b.id === bucketId);
        if (bucket) {
          bucket.spentCents += amount;
        }
      }

      if (action.cardId) {
        const card = state.cards.find((c) => c.id === action.cardId);
        if (card?.isCredit && card.creditLimitCents != null) {
          const debt = clonedDebts.find(
            (d) => d.type === 'CREDIT_CARD' && d.name === card.label
          );
          if (debt) {
            debt.balanceCents += amount;
          }
        }
      }
      break;
    }
    case 'DELAY_PURCHASE':
    case 'REJECT_PURCHASE':
      break;
    default:
      break;
  }

  const buckets: BucketProjection[] = clonedBuckets.map((b) => ({
    bucketId: b.id,
    projectedSpentCents: b.spentCents,
    projectedOverLimit: b.limitCents != null ? b.spentCents > b.limitCents : false,
  }));

  const debt: DebtProjection[] = clonedDebts.map((d) => ({
    debtId: d.id,
    projectedBalanceCents: d.balanceCents,
    projectedUtilization:
      d.creditLimitCents != null && d.creditLimitCents > 0
        ? d.balanceCents / d.creditLimitCents
        : null,
  }));

  const projectedLiquid =
    state.cash?.liquidCents != null && action.type !== 'REJECT_PURCHASE'
      ? state.cash.liquidCents
      : state.cash?.liquidCents ?? null;

  const cash: CashProjection = {
    projectedLiquidCents: projectedLiquid,
    projectedOverdraftRisk: null,
  };

  return { buckets, debt, cash };
}
