import type {
  BucketId,
  BucketProjection,
  CashProjection,
  DebtAccount,
  DebtProjection,
  EngineAction,
  EngineContext,
  EngineState,
  NormalizedCardId,
} from './types.js';
import { available, getCashState, getDebtAccounts, hasAvailableValue } from './types.js';

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
  if (!hasAvailableValue(debts)) return debts;
  return available(debts.value.map((d) => ({ ...d })));
}

function recomputeBucketBalance(bucket: EngineState['buckets'][number]): void {
  const limit = bucket.limitCents == null ? 0 : bucket.limitCents;
  const posted = bucket.postedSpendCents == null ? 0 : bucket.postedSpendCents;
  const pending = bucket.pendingSpendCents == null ? 0 : bucket.pendingSpendCents;
  bucket.committedCents = posted + pending;
  bucket.remainingCents = Math.max(0, limit - bucket.committedCents);
}

function reduceProjectedLiquid(projectedLiquid: number | null, amount: number): number | null {
  if (projectedLiquid == null || !hasPositiveNumber(amount)) return projectedLiquid;
  return Math.max(0, projectedLiquid - amount);
}

function findLinkedDebt(
  debts: EngineState['debts'],
  linkedDebtId?: string | null
): DebtAccount | undefined {
  if (!hasNonEmptyString(linkedDebtId)) return undefined;
  const resolvedDebts = getDebtAccounts(debts);
  return resolvedDebts.find((debt) => debt.id === linkedDebtId);
}

function applyUseCard(
  buckets: EngineState['buckets'],
  debts: EngineState['debts'],
  state: EngineState,
  ctx: EngineContext,
  action: EngineAction,
  amount: number,
  projectedLiquid: number | null
): number | null {
  if (!hasNonEmptyString(action.cardId) || !hasPositiveNumber(amount)) return projectedLiquid;

  const bucketId = pickBucketForContext(state, ctx);
  if (hasNonEmptyString(bucketId)) {
    const bucket = buckets.find((b) => b.id === bucketId);
    if (bucket !== undefined) {
      bucket.pendingSpendCents += amount;
      recomputeBucketBalance(bucket);
    }
  }

  const card = state.cards.find((c) => c.id === action.cardId);
  if (card === undefined) return projectedLiquid;

  if (card.isCredit === true) {
    const debt = findLinkedDebt(debts, card.linkedDebtId);
    if (debt !== undefined) {
      debt.balanceCents += amount;
    }
    return projectedLiquid;
  }

  return reduceProjectedLiquid(projectedLiquid, amount);
}

function applyPaydown(
  debts: EngineState['debts'],
  action: EngineAction,
  projectedLiquid: number | null
): number | null {
  if (
    !hasNonEmptyString(action.debtId) ||
    !hasPositiveNumber(action.paydownAmountCents)
  ) {
    return projectedLiquid;
  }
  const resolvedDebts = getDebtAccounts(debts);
  const debt = resolvedDebts.find((d) => d.id === action.debtId);
  if (debt === undefined) return projectedLiquid;
  const delta = Math.min(debt.balanceCents, action.paydownAmountCents);
  debt.balanceCents -= delta;
  return reduceProjectedLiquid(projectedLiquid, delta);
}

function pickBestCashOrDebitCard(state: EngineState): NormalizedCardId | undefined {
  const debit = state.cards.find((card) => card.isActive && !card.isCredit);
  if (debit !== undefined) return debit.id;
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
  const cashState = getCashState(state.cash);
  let projectedLiquid =
    cashState != null && cashState.liquidCents != null ? cashState.liquidCents : null;

  switch (action.type) {
    case 'USE_CARD': {
      projectedLiquid = applyUseCard(
        clonedBuckets,
        clonedDebts,
        state,
        ctx,
        action,
        amount,
        projectedLiquid
      );
      break;
    }
    case 'USE_CARD_WITH_PAYDOWN': {
      // Composite actions stay single-step and ordered: purchase first, paydown second.
      projectedLiquid = applyUseCard(
        clonedBuckets,
        clonedDebts,
        state,
        ctx,
        action,
        amount,
        projectedLiquid
      );
      projectedLiquid = applyPaydown(clonedDebts, action, projectedLiquid);
      break;
    }
    case 'PAY_DOWN_DEBT': {
      projectedLiquid = applyPaydown(clonedDebts, action, projectedLiquid);
      break;
    }
    case 'DELAY_PURCHASE':
    case 'SWITCH_MERCHANT': {
      if (action.type === 'SWITCH_MERCHANT') {
        const syntheticCardId = pickBestCashOrDebitCard(state);
        const syntheticAction: EngineAction = hasNonEmptyString(syntheticCardId)
          ? { type: 'USE_CARD', cardId: syntheticCardId }
          : { type: 'USE_CARD' };
        projectedLiquid = applyUseCard(
          clonedBuckets,
          clonedDebts,
          state,
          ctx,
          syntheticAction,
          amount,
          projectedLiquid
        );
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

  const debtAccounts = getDebtAccounts(clonedDebts);
  const debt: DebtProjection[] = debtAccounts.map((d) => ({
        debtId: d.id,
        projectedBalanceCents: d.balanceCents,
        projectedUtilization:
          d.creditLimitCents != null && d.creditLimitCents > 0
            ? d.balanceCents / d.creditLimitCents
            : null,
      }));

  const cashProjection: CashProjection = {
    projectedLiquidCents: projectedLiquid,
    projectedOverdraftRisk: null,
  };

  return { buckets, debt, cash: cashProjection };
}
