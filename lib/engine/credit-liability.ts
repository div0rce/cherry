import type { EngineAction, EngineState, NormalizedCard } from './types.js';
import { hasAvailableValue } from './types.js';

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value.trim() !== '';
}

export function actionRequiresResolvableCreditLiability(action: EngineAction): boolean {
  return action.type === 'USE_CARD' || action.type === 'USE_CARD_WITH_PAYDOWN';
}

export function findActionCard(
  state: Pick<EngineState, 'cards'>,
  action: Pick<EngineAction, 'cardId'>
): NormalizedCard | undefined {
  if (!hasNonEmptyString(action.cardId)) return undefined;
  return state.cards.find((candidate) => candidate.id === action.cardId);
}

export function hasResolvableCreditLiability(
  card: Pick<NormalizedCard, 'isCredit' | 'linkedDebtId'> | undefined,
  state: Pick<EngineState, 'debts' | 'capabilities'>
): boolean {
  if (card?.isCredit !== true) return false;
  if (!hasNonEmptyString(card.linkedDebtId)) return false;
  if (state.capabilities.debt.available !== true) return false;
  if (!hasAvailableValue(state.debts)) return false;
  return state.debts.value.some((debt) => debt.id === card.linkedDebtId);
}

export function hasUnresolvableCreditLiability(
  state: Pick<EngineState, 'cards' | 'debts' | 'capabilities'>,
  action: EngineAction
): boolean {
  if (!actionRequiresResolvableCreditLiability(action)) return false;
  const card = findActionCard(state, action);
  if (card?.isCredit !== true) return false;
  return hasResolvableCreditLiability(card, state) !== true;
}
