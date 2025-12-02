import type {
  BucketProjection,
  CashProjection,
  DebtProjection,
  EngineAction,
  EngineContext,
  EngineState,
  ObjectiveComponentScores,
  ObjectiveWeights,
} from './types';

// Default weights; tune per user once preferences are persisted.
export const DEFAULT_OBJECTIVE_WEIGHTS: ObjectiveWeights = {
  rewards: 1.0,
  runway: 1.0,
  debtRelief: 1.0,
  volatilityPenalty: 1.0,
  ruleViolationPenalty: 3.0,
};

function clampWeights(weights: ObjectiveWeights): ObjectiveWeights {
  const sanitize = (value: number) => (!Number.isFinite(value) || value < 0 ? 0 : value);

  return {
    rewards: sanitize(weights.rewards),
    runway: sanitize(weights.runway),
    debtRelief: sanitize(weights.debtRelief),
    volatilityPenalty: sanitize(weights.volatilityPenalty),
    ruleViolationPenalty: sanitize(weights.ruleViolationPenalty),
  };
}

function scoreComponents(
  state: EngineState,
  ctx: EngineContext,
  action: EngineAction,
  projections: {
    buckets: BucketProjection[];
    debt: DebtProjection[];
    cash: CashProjection;
  }
): ObjectiveComponentScores {
  // 1) Rewards estimate.
  let rewards = 0;
  if (action.type === 'USE_CARD' && action.cardId && ctx.amountCents) {
    const card = state.cards.find((c) => c.id === action.cardId);
    if (card) {
      const categoryKey = ctx.merchantCategoryKey ?? 'ALL';
      const rule =
        card.rewardRules.find((r) => r.categoryKey === categoryKey) ??
        card.rewardRules.find((r) => r.categoryKey === 'GENERAL_MERCHANDISE') ??
        card.rewardRules.find((r) => r.categoryKey === 'OTHER') ??
        card.rewardRules.find((r) => r.categoryKey === 'ALL');

      if (rule) {
        const base = ctx.amountCents;
        if (rule.rateType === 'CASHBACK') {
          rewards = base * rule.rateValue;
        } else if (rule.rateType === 'POINTS_PER_DOLLAR') {
          rewards = base * rule.rateValue;
        }
      }
    }
  }

  // 2) Runway: prefer leaving room in essential buckets.
  let runway = 0;
  for (const proj of projections.buckets) {
    const bucket = state.buckets.find((b) => b.id === proj.bucketId);
    if (!bucket) continue;
    if (bucket.isEssential && bucket.limitCents != null) {
      const remaining = bucket.limitCents - proj.projectedSpentCents;
      runway += remaining;
    }
  }

  // 3) Debt relief: penalize utilization.
  let debtRelief = 0;
  for (const proj of projections.debt) {
    if (proj.projectedUtilization != null) {
      debtRelief -= proj.projectedUtilization;
    }
  }

  // 4) Volatility penalty: placeholder for now.
  const volatilityPenalty = 0;
  const ruleViolationPenalty = 0;

  return {
    rewards,
    runway,
    debtRelief,
    volatilityPenalty,
    ruleViolationPenalty,
  };
}

function combineScores(
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

// Main scoring function that returns a scalar + human-readable reasons.
export function scoreDecision(
  state: EngineState,
  ctx: EngineContext,
  action: EngineAction,
  projections: {
    buckets: BucketProjection[];
    debt: DebtProjection[];
    cash: CashProjection;
  },
  weights: ObjectiveWeights = DEFAULT_OBJECTIVE_WEIGHTS
): { score: number; reasons: string[] } {
  const components = scoreComponents(state, ctx, action, projections);
  const score = combineScores(components, weights);

  const reasons: string[] = [];

  if (components.rewards !== 0) {
    reasons.push(`Rewards impact: ${(components.rewards / 100).toFixed(2)}`);
  }

  if (components.runway !== 0) {
    reasons.push('Runway adjusted by essential bucket margin.');
  }

  if (components.debtRelief !== 0) {
    reasons.push('Debt/utilization adjusted.');
  }

  return { score, reasons };
}
