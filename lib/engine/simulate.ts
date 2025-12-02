import type {
  BucketId,
  BucketProjection,
  CashProjection,
  DebtProjection,
  EngineAction,
  EngineContext,
  EngineState,
  NormalizedCardId,
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

function applyUseCard(
  buckets: EngineState['buckets'],
  debts: EngineState['debts'],
  state: EngineState,
  ctx: EngineContext,
  action: EngineAction,
  amount: number
): void {
  if (!action.cardId || amount <= 0) return;

  const bucketId = pickBucketForContext(state, ctx);
  if (bucketId) {
    const bucket = buckets.find((b) => b.id === bucketId);
    if (bucket) {
      bucket.spentCents += amount;
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
  if (!action.debtId || !action.paydownAmountCents || action.paydownAmountCents <= 0) return;
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
  const amount = ctx.amountCents ?? 0;
  const clonedBuckets = cloneBuckets(state.buckets);
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
        const syntheticAction: EngineAction = syntheticCardId
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

  let projectedLiquid = state.cash?.liquidCents ?? null;
  if (
    projectedLiquid != null &&
    (action.type === 'PAY_DOWN_DEBT' || action.type === 'USE_CARD_WITH_PAYDOWN') &&
    action.paydownAmountCents
  ) {
    projectedLiquid = Math.max(0, projectedLiquid - action.paydownAmountCents);
  }

  const cash: CashProjection = {
    projectedLiquidCents: projectedLiquid,
    projectedOverdraftRisk: null,
  };

  return { buckets, debt, cash };
}
