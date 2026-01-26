import type { EngineAction, EngineContext, EngineState } from './types';

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

function surfaceSupportsAdvancedActions(ctx: EngineContext): boolean {
  if (ctx.surface === 'web') return true;
  if (ctx.surface === 'extension') return true;
  return false;
}

function pickTopDebtAccounts(state: EngineState, max: number): string[] {
  const sorted = [...state.debts].sort((a, b) => {
    const aprA = a.aprPercent == null ? 0 : a.aprPercent;
    const aprB = b.aprPercent == null ? 0 : b.aprPercent;
    if (aprA !== aprB) return aprB - aprA;
    return b.balanceCents - a.balanceCents;
  });
  return sorted.slice(0, max).map((d) => d.id);
}

function computePaydownAmountCents(state: EngineState, ctx: EngineContext): number | null {
  const amount = ctx.amountCents == null ? 0 : ctx.amountCents;
  if (amount <= 0) return null;

  const base = Math.floor(amount * 0.5);
  const hardCap = 50_000;
  const paydown = Math.min(base, hardCap);

  const liquid = state.cash && state.cash.liquidCents != null ? state.cash.liquidCents : null;
  if (liquid != null) {
    const buffer = 0;
    if (paydown > liquid - buffer) {
      if (liquid - buffer <= 0) return null;
      return Math.max(0, liquid - buffer);
    }
  }

  return paydown > 0 ? paydown : null;
}

export function generateCandidateActions(state: EngineState, ctx: EngineContext): EngineAction[] {
  const actions: EngineAction[] = [];
  const amount = ctx.amountCents == null ? 0 : ctx.amountCents;
  const hasPositiveAmount = amount > 0;
  const advanced = surfaceSupportsAdvancedActions(ctx);
  const isZeroAmount = !hasPositiveAmount;

  if (isZeroAmount) {
    actions.push({ type: 'REJECT_PURCHASE', meta: { reasonHint: 'NO_AMOUNT' } });
    return actions;
  }

  for (const card of state.cards) {
    if (card.isActive !== true) continue;
    actions.push({
      type: 'USE_CARD',
      cardId: card.id,
    });
  }

  const liquidCents = state.cash && state.cash.liquidCents != null ? state.cash.liquidCents : 0;
  if (advanced && state.debts.length > 0 && liquidCents > 0) {
    const paydownAmount = computePaydownAmountCents(state, ctx);
    if (paydownAmount !== null && !Number.isNaN(paydownAmount) && paydownAmount > 0) {
      const debtIds = pickTopDebtAccounts(state, 2);
      for (const card of state.cards) {
        if (card.isActive !== true || card.isCredit !== true) continue;
        for (const debtId of debtIds) {
          actions.push({
            type: 'USE_CARD_WITH_PAYDOWN',
            cardId: card.id,
            debtId,
            paydownAmountCents: paydownAmount,
            paydownScheduledDateMs:
              state.cash && state.cash.nextPaycheckDateMs != null
                ? state.cash.nextPaycheckDateMs
                : null,
            meta: { reasonHint: 'CARD_PLUS_DEBT_RELIEF' },
          });
        }
      }

      for (const debtId of debtIds) {
        actions.push({
          type: 'PAY_DOWN_DEBT',
          debtId,
          paydownAmountCents: paydownAmount,
          paydownScheduledDateMs:
            state.cash && state.cash.nextPaycheckDateMs != null
              ? state.cash.nextPaycheckDateMs
              : null,
          meta: { reasonHint: 'DEBT_ONLY_RELIEF' },
        });
      }
    }
  }

  const hasMerchantCategoryKey = hasNonEmptyString(ctx.merchantCategoryKey);
  const isEssentialCategory = hasMerchantCategoryKey
    ? state.buckets.some(
        (bucket) =>
          bucket.categoryKey === ctx.merchantCategoryKey && bucket.isEssential
      )
    : false;

  if (isEssentialCategory === false) {
    actions.push({ type: 'DELAY_PURCHASE', delayDays: 3 });
    actions.push({ type: 'DELAY_PURCHASE', delayDays: 7 });
  }

  if (advanced && hasMerchantCategoryKey) {
    actions.push({
      type: 'SWITCH_MERCHANT',
      altMerchantName: 'cheaper alternative',
      altMerchantCategoryKey:
        ctx.merchantCategoryKey == null ? null : ctx.merchantCategoryKey,
      meta: { reasonHint: 'ALT_MERCHANT_SAME_CATEGORY' },
    });
  }

  actions.push({ type: 'REJECT_PURCHASE', meta: { reasonHint: 'USER_CAN_DECLINE' } });

  return actions;
}
