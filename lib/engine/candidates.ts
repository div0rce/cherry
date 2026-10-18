import {
  getEngineCapabilities,
  getCashState,
  getDebtAccounts,
  hasKnownBucketEssentiality,
  isBucketEssential,
  type EngineAction,
  type EngineContext,
  type EngineState,
} from './types.js';

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

function surfaceSupportsAdvancedActions(ctx: EngineContext): boolean {
  if (ctx.surface === 'web') return true;
  if (ctx.surface === 'extension') return true;
  return false;
}

function aprOrZero(aprPercent: number | null | undefined): number {
  return aprPercent == null ? 0 : aprPercent;
}

function pickTopDebtAccounts(state: EngineState, max: number): string[] {
  const sorted = [...getDebtAccounts(state.debts)].sort((a, b) => {
    const aprA = aprOrZero(a.aprPercent);
    const aprB = aprOrZero(b.aprPercent);
    if (aprA !== aprB) return aprB - aprA;
    return b.balanceCents - a.balanceCents;
  });
  return sorted.slice(0, max).map((d) => d.id);
}

function knownLiquidCents(state: EngineState): number | null {
  const cash = getCashState(state.cash);
  return cash != null && cash.liquidCents != null ? cash.liquidCents : null;
}

// Returns undefined when the liquid balance does not constrain the paydown.
function capPaydownToLiquid(paydown: number, liquid: number | null): number | null | undefined {
  if (liquid == null) return undefined;
  const buffer = 0;
  if (!(paydown > liquid - buffer)) return undefined;
  if (liquid - buffer <= 0) return null;
  return Math.max(0, liquid - buffer);
}

function computePaydownAmountCents(state: EngineState, ctx: EngineContext): number | null {
  const amount = ctx.amountCents == null ? 0 : ctx.amountCents;
  if (amount <= 0) return null;

  const base = Math.floor(amount * 0.5);
  const hardCap = 50_000;
  const paydown = Math.min(base, hardCap);

  const capped = capPaydownToLiquid(paydown, knownLiquidCents(state));
  if (capped !== undefined) return capped;

  return paydown > 0 ? paydown : null;
}

function pushCardActions(actions: EngineAction[], state: EngineState): void {
  for (const card of state.cards) {
    if (card.isActive !== true) continue;
    actions.push({
      type: 'USE_CARD',
      cardId: card.id,
    });
  }
}

type EngineCapabilities = ReturnType<typeof getEngineCapabilities>;

function paydownPreconditionsMet(state: EngineState, capabilities: EngineCapabilities): boolean {
  if (capabilities.debt.available !== true) return false;
  if (capabilities.liquidCash.available !== true) return false;
  const liquid = knownLiquidCents(state);
  const liquidCents = liquid != null ? liquid : 0;
  const debtCount = getDebtAccounts(state.debts).length;
  if (!(debtCount > 0)) return false;
  return liquidCents > 0;
}

function isUsablePaydown(paydownAmount: number | null): paydownAmount is number {
  if (paydownAmount === null) return false;
  if (Number.isNaN(paydownAmount)) return false;
  return paydownAmount > 0;
}

function isActiveCreditCard(card: EngineState['cards'][number]): boolean {
  if (card.isActive !== true) return false;
  return card.isCredit === true;
}

function pushPaydownActions(
  actions: EngineAction[],
  state: EngineState,
  paydownAmount: number
): void {
  const debtIds = pickTopDebtAccounts(state, 2);
  for (const card of state.cards) {
    if (!isActiveCreditCard(card)) continue;
    for (const debtId of debtIds) {
      actions.push({
        type: 'USE_CARD_WITH_PAYDOWN',
        cardId: card.id,
        debtId,
        paydownAmountCents: paydownAmount,
        meta: { reasonHint: 'CARD_PLUS_DEBT_RELIEF' },
      });
    }
  }

  for (const debtId of debtIds) {
    actions.push({
      type: 'PAY_DOWN_DEBT',
      debtId,
      paydownAmountCents: paydownAmount,
      meta: { reasonHint: 'DEBT_ONLY_RELIEF' },
    });
  }
}

function maybePushPaydownActions(
  actions: EngineAction[],
  state: EngineState,
  ctx: EngineContext,
  capabilities: EngineCapabilities
): void {
  if (!surfaceSupportsAdvancedActions(ctx)) return;
  if (!paydownPreconditionsMet(state, capabilities)) return;
  const paydownAmount = computePaydownAmountCents(state, ctx);
  if (isUsablePaydown(paydownAmount)) {
    pushPaydownActions(actions, state, paydownAmount);
  }
}

function isEssentialBucketForCategory(
  bucket: EngineState['buckets'][number],
  merchantCategoryKey: string | null | undefined
): boolean {
  if (bucket.categoryKey !== merchantCategoryKey) return false;
  if (!hasKnownBucketEssentiality(bucket)) return false;
  return isBucketEssential(bucket);
}

function shouldOfferDelay(
  state: EngineState,
  ctx: EngineContext,
  capabilities: EngineCapabilities
): boolean {
  if (!hasNonEmptyString(ctx.merchantCategoryKey)) return true;
  if (capabilities.essentiality.available !== true) return false;
  const isEssentialCategory = state.buckets.some((bucket) =>
    isEssentialBucketForCategory(bucket, ctx.merchantCategoryKey)
  );
  return isEssentialCategory === false;
}

function maybePushSwitchMerchant(actions: EngineAction[], ctx: EngineContext): void {
  if (!surfaceSupportsAdvancedActions(ctx)) return;
  if (!hasNonEmptyString(ctx.merchantCategoryKey)) return;
  actions.push({
    type: 'SWITCH_MERCHANT',
    altMerchantName: 'cheaper alternative',
    altMerchantCategoryKey: ctx.merchantCategoryKey,
    meta: { reasonHint: 'ALT_MERCHANT_SAME_CATEGORY' },
  });
}

export function generateCandidateActions(state: EngineState, ctx: EngineContext): EngineAction[] {
  const actions: EngineAction[] = [];
  const capabilities = getEngineCapabilities(state);
  const amount = ctx.amountCents == null ? 0 : ctx.amountCents;
  const hasPositiveAmount = amount > 0;

  if (!hasPositiveAmount) {
    actions.push({ type: 'REJECT_PURCHASE', meta: { reasonHint: 'NO_AMOUNT' } });
    return actions;
  }

  pushCardActions(actions, state);
  maybePushPaydownActions(actions, state, ctx, capabilities);

  if (shouldOfferDelay(state, ctx, capabilities)) {
    actions.push({ type: 'DELAY_PURCHASE', delayDays: 3 });
    actions.push({ type: 'DELAY_PURCHASE', delayDays: 7 });
  }

  maybePushSwitchMerchant(actions, ctx);

  actions.push({ type: 'REJECT_PURCHASE', meta: { reasonHint: 'USER_CAN_DECLINE' } });

  return actions;
}
