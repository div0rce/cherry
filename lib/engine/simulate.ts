import type {
  BucketId,
  BucketProjection,
  CashProjection,
  DebtProjection,
  EngineAction,
  EngineContext,
  EngineState,
  NormalizedCardId,
} from './types.js';

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

function hasPositiveNumber(value?: number | null): value is number {
  return value !== undefined && value !== null && !Number.isNaN(value) && value > 0;
}

function pickBucketForContext(state: EngineState, ctx: EngineContext): BucketId | null {
  if (!hasNonEmptyString(ctx.merchantCategoryKey)) return null;
  const candidate = state.buckets.find((b) => b.categoryKey === ctx.merchantCategoryKey);
  return candidate ? candidate.id : null;
}

function cloneBuckets(buckets: EngineState['buckets']): EngineState['buckets'] {
  return buckets.map((b) => ({ ...b }));
}

function cloneDebts(debts: EngineState['debts']): EngineState['debts'] {
  return debts.map((d) => ({ ...d }));
}

function recomputeBucketBalance(bucket: EngineState['buckets'][number]): void {
  const limit = bucket.limitCents == null ? 0 : bucket.limitCents;
  const posted = bucket.postedSpendCents == null ? 0 : bucket.postedSpendCents;
  const pending = bucket.pendingSpendCents == null ? 0 : bucket.pendingSpendCents;
  bucket.committedCents = posted + pending;
  bucket.remainingCents = Math.max(0, limit - bucket.committedCents);
}

function applyUseCard(
  buckets: EngineState['buckets'],
  debts: EngineState['debts'],
  state: EngineState,
  ctx: EngineContext,
  action: EngineAction,
  amount: number
): void {
  if (!hasNonEmptyString(action.cardId) || !hasPositiveNumber(amount)) return;

  const bucketId = pickBucketForContext(state, ctx);
  if (hasNonEmptyString(bucketId)) {
    const bucket = buckets.find((b) => b.id === bucketId);
    if (bucket) {
      bucket.postedSpendCents += amount;
      recomputeBucketBalance(bucket);
    }
  }

  const card = state.cards.find((c) => c.id === action.cardId);
  if (card?.isCredit && card.creditLimitCents != null) {
    const debt = debts.find((d) => d.type === 'CREDIT_CARD' && d.name === card.label);
    if (debt) {
      debt.balanceCents += amount;
    }
  }
}

function applyPaydown(
  debts: EngineState['debts'],
  action: EngineAction
): void {
  if (
    !hasNonEmptyString(action.debtId) ||
    !hasPositiveNumber(action.paydownAmountCents)
  ) {
    return;
  }
  const debt = debts.find((d) => d.id === action.debtId);
  if (!debt) return;
  const delta = Math.min(debt.balanceCents, action.paydownAmountCents);
  debt.balanceCents -= delta;
}

function pickBestCashOrDebitCard(state: EngineState): NormalizedCardId | undefined {
  const debit = state.cards.find((card) => card.isActive && !card.isCredit);
  if (debit) return debit.id;
  const any = state.cards.find((card) => card.isActive);
  return any?.id;
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
  const amount = ctx.amountCents == null ? 0 : ctx.amountCents;
  const clonedBuckets = cloneBuckets(state.buckets);
  clonedBuckets.forEach(recomputeBucketBalance);
  const clonedDebts = cloneDebts(state.debts);

  switch (action.type) {
    case 'USE_CARD': {
      applyUseCard(clonedBuckets, clonedDebts, state, ctx, action, amount);
      break;
    }
    case 'USE_CARD_WITH_PAYDOWN': {
      applyUseCard(clonedBuckets, clonedDebts, state, ctx, action, amount);
      applyPaydown(clonedDebts, action);
      break;
    }
    case 'PAY_DOWN_DEBT': {
      applyPaydown(clonedDebts, action);
      break;
    }
    case 'DELAY_PURCHASE':
    case 'SWITCH_MERCHANT': {
      if (action.type === 'SWITCH_MERCHANT') {
        const syntheticCardId = pickBestCashOrDebitCard(state);
        const syntheticAction: EngineAction = hasNonEmptyString(syntheticCardId)
          ? { type: 'USE_CARD', cardId: syntheticCardId }
          : { type: 'USE_CARD' };
        applyUseCard(clonedBuckets, clonedDebts, state, ctx, syntheticAction, amount);
      }
      break;
    }
    case 'REJECT_PURCHASE':
      break;
    default:
      break;
  }

  const buckets: BucketProjection[] = clonedBuckets.map((b) => {
    const projectedCommitted = b.postedSpendCents + b.pendingSpendCents;
    const limitCents = b.limitCents == null ? 0 : b.limitCents;
    const projectedRemaining = Math.max(0, limitCents - projectedCommitted);
    const projectedOverLimit =
      b.limitCents != null ? projectedCommitted > b.limitCents : false;
    return {
      bucketId: b.id,
      projectedPostedSpendCents: b.postedSpendCents,
      projectedPendingSpendCents: b.pendingSpendCents,
      projectedCommittedCents: projectedCommitted,
      projectedRemainingCents: projectedRemaining,
      projectedOverLimit,
    };
  });

  const debt: DebtProjection[] = clonedDebts.map((d) => ({
    debtId: d.id,
    projectedBalanceCents: d.balanceCents,
    projectedUtilization:
      d.creditLimitCents != null && d.creditLimitCents > 0
        ? d.balanceCents / d.creditLimitCents
        : null,
  }));

  let projectedLiquid =
    state.cash && state.cash.liquidCents != null ? state.cash.liquidCents : null;
  if (
    projectedLiquid != null &&
    (action.type === 'PAY_DOWN_DEBT' || action.type === 'USE_CARD_WITH_PAYDOWN') &&
    hasPositiveNumber(action.paydownAmountCents)
  ) {
    projectedLiquid = Math.max(0, projectedLiquid - action.paydownAmountCents);
  }

  const cash: CashProjection = {
    projectedLiquidCents: projectedLiquid,
    projectedOverdraftRisk: null,
  };

  return { buckets, debt, cash };
}
