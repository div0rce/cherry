import type {
  EngineAction,
  EngineContext,
  EngineUserState,
  ObjectiveComponentScores,
  ObjectiveWeights,
} from './types';

// Default weights; tune per user once preferences are persisted.
export const DEFAULT_OBJECTIVE_WEIGHTS: ObjectiveWeights = {
  rewards: 1,
  runway: 1,
  debtRelief: 1,
  volatilityPenalty: 1,
  ruleViolationPenalty: 3,
};

export function clampWeights(weights: ObjectiveWeights): ObjectiveWeights {
  const sanitize = (value: number) => (!Number.isFinite(value) || value < 0 ? 0 : value);

  return {
    rewards: sanitize(weights.rewards),
    runway: sanitize(weights.runway),
    debtRelief: sanitize(weights.debtRelief),
    volatilityPenalty: sanitize(weights.volatilityPenalty),
    ruleViolationPenalty: sanitize(weights.ruleViolationPenalty),
  };
}

export function scoreComponents(
  state: EngineUserState,
  ctx: EngineContext,
  action: EngineAction
): ObjectiveComponentScores {
  const amountCents = ctx.amountCents ?? 0;
  const categoryKey = ctx.merchantCategoryKey ?? 'OTHER';

  let rewards = 0;
  let ruleViolationPenalty = 0;

  if (action.type === 'USE_CARD' && action.cardId && amountCents > 0) {
    const card = state.cards.find((c) => c.id === action.cardId);
    if (card) {
      const matchingRule =
        card.rewards.find((rule) => rule.categoryKey === categoryKey) ??
        card.rewards.find((rule) => rule.categoryKey === 'GENERAL_MERCHANDISE') ??
        card.rewards.find((rule) => rule.categoryKey === 'OTHER');

      if (matchingRule) {
        const dollars = amountCents / 100;
        rewards =
          matchingRule.rateType === 'CASHBACK'
            ? amountCents * matchingRule.rateValue
            : dollars * matchingRule.rateValue;
      }
    }
  }

  const bucket = state.buckets.find((b) => b.categoryKey === categoryKey);
  if (bucket && bucket.limitCents != null && amountCents > 0) {
    const projected = bucket.balanceCents + amountCents;
    if (projected > bucket.limitCents) {
      ruleViolationPenalty = 1;
    }
  }

  return {
    rewards,
    runway: 0,
    debtRelief: 0,
    volatilityPenalty: 0,
    ruleViolationPenalty,
  };
}

export function combineScores(
  components: ObjectiveComponentScores,
  weights: ObjectiveWeights
): number {
  const w = clampWeights(weights);

  return (
    components.rewards * w.rewards +
    components.runway * w.runway +
    components.debtRelief * w.debtRelief -
    components.volatilityPenalty * w.volatilityPenalty -
    components.ruleViolationPenalty * w.ruleViolationPenalty
  );
}
