import type {
  BucketProjection,
  CashProjection,
  DebtProjection,
  EngineAction,
  EngineContext,
  EngineObjectiveProfile,
  EngineObjectiveProfileId,
  EngineState,
  EngineUserPreferences,
  ObjectiveComponentScores,
  ObjectiveWeights,
} from './types';

export const OBJECTIVE_PROFILES: Record<EngineObjectiveProfileId, EngineObjectiveProfile> = {
  MAX_REWARDS: {
    id: 'MAX_REWARDS',
    label: 'Maximize rewards',
    description:
      'Favor high-reward cards even at the cost of some volatility, while keeping hard rules intact.',
    weights: {
      rewards: 1,
      runway: 0.4,
      debtRelief: 0.4,
      volatility: 0.3,
      ruleViolations: 3,
    },
  },
  KILL_DEBT: {
    id: 'KILL_DEBT',
    label: 'Kill debt fast',
    description: 'Prioritize debt relief and utilization improvements over raw rewards.',
    weights: {
      rewards: 0.5,
      runway: 0.7,
      debtRelief: 1.5,
      volatility: 0.8,
      ruleViolations: 3,
    },
  },
  DONT_GO_BROKE: {
    id: 'DONT_GO_BROKE',
    label: "Don't go broke",
    description: 'Favor buffer and stability; rewards matter but safety wins.',
    weights: {
      rewards: 0.4,
      runway: 1.5,
      debtRelief: 0.7,
      volatility: 1,
      ruleViolations: 3,
    },
  },
  BALANCED: {
    id: 'BALANCED',
    label: 'Balanced',
    description: 'Blend rewards, safety, and debt relief evenly.',
    weights: {
      rewards: 1,
      runway: 1,
      debtRelief: 1,
      volatility: 1,
      ruleViolations: 3,
    },
  },
};

export const DEFAULT_ENGINE_USER_PREFERENCES: EngineUserPreferences = {
  profileId: 'BALANCED',
};

// Explicit defaults mirror the balanced profile.
export const DEFAULT_OBJECTIVE_WEIGHTS: ObjectiveWeights = {
  ...OBJECTIVE_PROFILES.BALANCED.weights,
};

function logObjectiveWarning(message: string, meta?: unknown) {
  if (process.env.NODE_ENV === 'test') return;
  console.warn('[engine] objective warning', { message, meta });
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function normalizeObjectiveWeights(weights: ObjectiveWeights): ObjectiveWeights {
  return {
    rewards: clampNonNegative(weights.rewards),
    runway: clampNonNegative(weights.runway),
    debtRelief: clampNonNegative(weights.debtRelief),
    volatility: clampNonNegative(weights.volatility),
    ruleViolations: clampNonNegative(weights.ruleViolations),
  };
}

export function getObjectiveProfileById(id: EngineObjectiveProfileId): EngineObjectiveProfile {
  const profile = OBJECTIVE_PROFILES[id];
  if (!profile) {
    logObjectiveWarning('Unknown objective profile; using BALANCED', { id });
    return OBJECTIVE_PROFILES.BALANCED;
  }
  return profile;
}

export function mergeProfileWithOverrides(
  profile: EngineObjectiveProfile,
  overrides?: Partial<ObjectiveWeights> | null
): ObjectiveWeights {
  const merged: ObjectiveWeights = {
    rewards: overrides?.rewards ?? profile.weights.rewards,
    runway: overrides?.runway ?? profile.weights.runway,
    debtRelief: overrides?.debtRelief ?? profile.weights.debtRelief,
    volatility: overrides?.volatility ?? profile.weights.volatility,
    ruleViolations: overrides?.ruleViolations ?? profile.weights.ruleViolations,
  };

  return normalizeObjectiveWeights(merged);
}

export function getObjectiveWeightsForPreferences(
  preferences: EngineUserPreferences | null | undefined
): ObjectiveWeights {
  if (!preferences) {
    logObjectiveWarning('Missing preferences; using defaults');
    return normalizeObjectiveWeights(DEFAULT_OBJECTIVE_WEIGHTS);
  }
  const profile = getObjectiveProfileById(preferences.profileId);
  return mergeProfileWithOverrides(profile, preferences.customWeights ?? null);
}

export function getObjectiveWeightsForState(state: EngineState): ObjectiveWeights {
  return getObjectiveWeightsForPreferences(state.preferences);
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
  if (
    (action.type === 'USE_CARD' || action.type === 'USE_CARD_WITH_PAYDOWN') &&
    action.cardId &&
    ctx.amountCents
  ) {
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
      runway += proj.projectedRemainingCents;
    }
  }

  // 3) Debt relief: reward lower utilization or balances, plus explicit paydowns.
  let debtRelief = 0;
  for (const proj of projections.debt) {
    const debt = state.debts.find((d) => d.id === proj.debtId);
    if (!debt) continue;
    const currentUtil =
      debt.creditLimitCents && debt.creditLimitCents > 0
        ? debt.balanceCents / debt.creditLimitCents
        : null;

    if (proj.projectedUtilization != null && currentUtil != null) {
      debtRelief += currentUtil - proj.projectedUtilization;
    } else {
      const balanceDelta = debt.balanceCents - proj.projectedBalanceCents;
      debtRelief += balanceDelta / 100_00;
    }
  }

  if (
    (action.type === 'PAY_DOWN_DEBT' || action.type === 'USE_CARD_WITH_PAYDOWN') &&
    action.paydownAmountCents
  ) {
    debtRelief += 1;
  }

  // 4) Volatility penalty: placeholder for now.
  const volatility = 0;
  const ruleViolations = 0;

  if (action.type === 'DELAY_PURCHASE' && ctx.amountCents) {
    runway -= 0.01 * ctx.amountCents;
  }

  if (action.type === 'REJECT_PURCHASE' && ctx.amountCents) {
    runway -= 0.05 * ctx.amountCents;
  }

  return {
    rewards,
    runway,
    debtRelief,
    volatility,
    ruleViolations,
  };
}

function combineScores(components: ObjectiveComponentScores, weights: ObjectiveWeights): number {
  const w = normalizeObjectiveWeights(weights);

  return (
    components.rewards * w.rewards +
    components.runway * w.runway +
    components.debtRelief * w.debtRelief -
    components.volatility * w.volatility -
    components.ruleViolations * w.ruleViolations
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
  weights?: ObjectiveWeights
): { score: number; reasons: string[]; components: ObjectiveComponentScores; weights: ObjectiveWeights } {
  const components = scoreComponents(state, ctx, action, projections);
  const resolvedWeights = weights ?? getObjectiveWeightsForState(state);
  const normalizedWeights = normalizeObjectiveWeights(resolvedWeights);
  const score = combineScores(components, normalizedWeights);

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

  if (
    (action.type === 'USE_CARD_WITH_PAYDOWN' || action.type === 'PAY_DOWN_DEBT') &&
    action.paydownAmountCents
  ) {
    reasons.push(
      `Includes a paydown of ${(action.paydownAmountCents / 100).toFixed(2)} toward debt.`
    );
  }

  if (action.type === 'DELAY_PURCHASE' && action.delayDays) {
    reasons.push(`Delays purchase by ${action.delayDays} day(s) to reduce near-term risk.`);
  }

  if (action.type === 'SWITCH_MERCHANT') {
    reasons.push('Suggests an alternate merchant in the same category to save cost.');
  }

  if (action.type === 'REJECT_PURCHASE') {
    reasons.push('Recommends skipping this purchase to protect constraints.');
  }

  return { score, reasons, components, weights: normalizedWeights };
}

export function scoreAction(
  state: EngineState,
  ctx: EngineContext,
  action: EngineAction,
  projections: {
    buckets: BucketProjection[];
    debt: DebtProjection[];
    cash: CashProjection;
  },
  weights: ObjectiveWeights
): { score: number; components: ObjectiveComponentScores } {
  const components = scoreComponents(state, ctx, action, projections);
  const score = combineScores(components, weights);
  return { score, components };
}
