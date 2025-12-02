import type { EngineAction, EngineContext, EngineState } from './types';

export function generateCandidateActions(state: EngineState, ctx: EngineContext): EngineAction[] {
  const actions: EngineAction[] = [];
  const amount = ctx.amountCents ?? 0;
  const isZeroAmount = amount <= 0;

  if (isZeroAmount) {
    actions.push({ type: 'REJECT_PURCHASE' });
    return actions;
  }

  for (const card of state.cards) {
    if (!card.isActive) continue;
    actions.push({
      type: 'USE_CARD',
      cardId: card.id,
    });
  }

  actions.push({ type: 'DELAY_PURCHASE', delayDays: 3 });
  actions.push({ type: 'DELAY_PURCHASE', delayDays: 7 });
  actions.push({ type: 'REJECT_PURCHASE' });

  return actions;
}
