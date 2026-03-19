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
} from './types.js';
import {
  getDebtAccounts,
  getEngineCapabilities,
  hasKnownBucketEssentiality,
  isBucketEssential,
} from './types.js';
import { getRewardSemanticsForCardSpend } from './reward-semantics.js';
import { DEFAULT_ENGINE_RUNTIME, type EngineRuntime } from './runtime.js';

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

function hasNonZeroNumber(value?: number | null): value is number {
  return value !== undefined && value !== null && !Number.isNaN(value) && value !== 0;
}

export const OBJECTIVE_PROFILES: Record<EngineObjectiveProfileId, EngineObjectiveProfile> = {
  MAX_REWARDS: {
    id: 'MAX_REWARDS',
    label: 'Maximize rewards',
    description:
      'Favor higher monetary rewards while still considering heuristic runway and debt-pressure relief.',
    weights: {
      rewards: 1,
      runway: 0.4,
      debtRelief: 0.4,
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
    },
  },
  DONT_GO_BROKE: {
    id: 'DONT_GO_BROKE',
    label: "Don't go broke",
    description: 'Favor heuristic buffer runway; rewards matter but runway wins.',
    weights: {
      rewards: 0.4,
      runway: 1.5,
      debtRelief: 0.7,
    },
  },
  BALANCED: {
    id: 'BALANCED',
    label: 'Balanced',
    description: 'Blend monetary rewards, heuristic runway, and heuristic debt-pressure relief.',
    weights: {
      rewards: 1,
      runway: 1,
      debtRelief: 1,
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

function logObjectiveWarning(runtime: EngineRuntime, message: string, meta?: unknown) {
  if (!runtime.enableLogs) return;
  runtime.logger?.warn('[engine] objective warning', { message, meta });
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function centsOrZero(value?: number | null): number {
  return value != null ? value : 0;
}

function formatCentsAsDollars(cents: number): string {
  const centsPerDollar = 100;
  return (cents / centsPerDollar).toFixed(2);
}

export function normalizeObjectiveWeights(weights: ObjectiveWeights): ObjectiveWeights {
  return {
    rewards: clampNonNegative(weights.rewards),
    runway: clampNonNegative(weights.runway),
    debtRelief: clampNonNegative(weights.debtRelief),
  };
}

export function getObjectiveProfileById(
  id: EngineObjectiveProfileId,
  runtime: EngineRuntime = DEFAULT_ENGINE_RUNTIME
): EngineObjectiveProfile {
  const profile = OBJECTIVE_PROFILES[id];
  if (profile == null) {
    logObjectiveWarning(runtime, 'Unknown objective profile; using BALANCED', { id });
    return OBJECTIVE_PROFILES.BALANCED;
  }
  return profile;
}

export function mergeProfileWithOverrides(
  profile: EngineObjectiveProfile,
  overrides?: Partial<ObjectiveWeights> | null
): ObjectiveWeights {
  const merged: ObjectiveWeights = {
    rewards:
      overrides && overrides.rewards != null ? overrides.rewards : profile.weights.rewards,
    runway: overrides && overrides.runway != null ? overrides.runway : profile.weights.runway,
    debtRelief:
      overrides && overrides.debtRelief != null ? overrides.debtRelief : profile.weights.debtRelief,
  };

  return normalizeObjectiveWeights(merged);
}

export function getObjectiveWeightsForPreferences(
  preferences: EngineUserPreferences | null | undefined,
  runtime: EngineRuntime = DEFAULT_ENGINE_RUNTIME
): ObjectiveWeights {
  if (preferences === null || preferences === undefined) {
    logObjectiveWarning(runtime, 'Missing preferences; using defaults');
    return normalizeObjectiveWeights(DEFAULT_OBJECTIVE_WEIGHTS);
  }
  const profile = getObjectiveProfileById(preferences.profileId, runtime);
  const customWeights =
    preferences.customWeights == null ? null : preferences.customWeights;
  return mergeProfileWithOverrides(profile, customWeights);
}

export function getObjectiveWeightsForState(
  state: EngineState,
  runtime: EngineRuntime = DEFAULT_ENGINE_RUNTIME
): ObjectiveWeights {
  return getObjectiveWeightsForPreferences(state.preferences, runtime);
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
    hasNonEmptyString(action.cardId) &&
    hasNonZeroNumber(ctx.amountCents)
  ) {
    const card = state.cards.find((c) => c.id === action.cardId);
    if (card !== undefined) {
      const rewardSemantics = getRewardSemanticsForCardSpend({
        card,
        amountCents: ctx.amountCents,
        merchantCategoryKey: ctx.merchantCategoryKey,
      });
      rewards = centsOrZero(rewardSemantics?.rewardValueCents);
    }
  }

  // 2) Runway: prefer leaving room in essential buckets.
  let runway = 0;
  const capabilities = getEngineCapabilities(state);
  if (capabilities.essentiality.available === true) {
    for (const proj of projections.buckets) {
      const bucket = state.buckets.find((b) => b.id === proj.bucketId);
      if (bucket === undefined) continue;
      if (
        hasKnownBucketEssentiality(bucket) &&
        isBucketEssential(bucket) &&
        bucket.limitCents != null
      ) {
        runway += proj.projectedRemainingCents;
      }
    }
  }

  // 3) Debt relief: reward lower utilization or balances, plus explicit paydowns.
  // This remains a bounded heuristic, but the subterms are now explicit.
  let utilizationImprovementScore = 0;
  let balanceReductionScore = 0;
  let paydownActionBonus = 0;
  const debts = getDebtAccounts(state.debts);
  if (capabilities.debt.available === true) {
    for (const proj of projections.debt) {
      const debt = debts.find((d) => d.id === proj.debtId);
      if (debt === undefined) continue;
      const currentUtil =
        debt.creditLimitCents !== null &&
        debt.creditLimitCents !== undefined &&
        debt.creditLimitCents > 0
          ? debt.balanceCents / debt.creditLimitCents
          : null;

      if (
        capabilities.utilization.available === true &&
        proj.projectedUtilization != null &&
        currentUtil != null
      ) {
        utilizationImprovementScore += currentUtil - proj.projectedUtilization;
      } else {
        const balanceDelta = debt.balanceCents - proj.projectedBalanceCents;
        balanceReductionScore += balanceDelta / 100_00;
      }
    }
  }

  if (
    (action.type === 'PAY_DOWN_DEBT' || action.type === 'USE_CARD_WITH_PAYDOWN') &&
    action.paydownAmountCents !== null &&
    action.paydownAmountCents !== undefined &&
    !Number.isNaN(action.paydownAmountCents) &&
    action.paydownAmountCents !== 0
  ) {
    paydownActionBonus += 1;
  }
  const debtRelief =
    utilizationImprovementScore + balanceReductionScore + paydownActionBonus;

  if (action.type === 'DELAY_PURCHASE' && hasNonZeroNumber(ctx.amountCents)) {
    runway -= 0.01 * ctx.amountCents;
  }

  if (action.type === 'REJECT_PURCHASE' && hasNonZeroNumber(ctx.amountCents)) {
    runway -= 0.05 * ctx.amountCents;
  }

  return {
    rewards,
    runway,
    debtRelief,
  };
}

function combineScores(components: ObjectiveComponentScores, weights: ObjectiveWeights): number {
  const w = normalizeObjectiveWeights(weights);

  return (
    components.rewards * w.rewards +
    components.runway * w.runway +
    components.debtRelief * w.debtRelief
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
  const resolvedWeights = weights == null ? getObjectiveWeightsForState(state) : weights;
  const normalizedWeights = normalizeObjectiveWeights(resolvedWeights);
  const score = combineScores(components, normalizedWeights);

  const reasons: string[] = [];
  const rewardSemantics =
    (action.type === 'USE_CARD' || action.type === 'USE_CARD_WITH_PAYDOWN') &&
    hasNonEmptyString(action.cardId)
      ? getRewardSemanticsForCardSpend({
          card: state.cards.find((card) => card.id === action.cardId),
          amountCents: ctx.amountCents,
          merchantCategoryKey: ctx.merchantCategoryKey,
        })
      : null;

  const rewardValueCents = centsOrZero(rewardSemantics?.rewardValueCents);
  const rewardPoints = rewardSemantics?.rewardPoints != null ? rewardSemantics.rewardPoints : 0;

  if (rewardValueCents > 0) {
    reasons.push(
      `Estimated cashback value: $${formatCentsAsDollars(rewardValueCents)}.`
    );
  } else if (rewardPoints > 0) {
    reasons.push(`Estimated issuer points: ${rewardPoints}.`);
  }

  if (components.runway !== 0) {
    reasons.push('Heuristic essential-margin runway adjusted.');
  }

  if (components.debtRelief !== 0) {
    reasons.push('Debt-pressure relief adjusted heuristically.');
  }

  if (
    (action.type === 'USE_CARD_WITH_PAYDOWN' || action.type === 'PAY_DOWN_DEBT') &&
    action.paydownAmountCents !== null &&
    action.paydownAmountCents !== undefined &&
    !Number.isNaN(action.paydownAmountCents) &&
    action.paydownAmountCents !== 0
  ) {
    reasons.push(
      `Includes a paydown of ${formatCentsAsDollars(action.paydownAmountCents)} toward debt.`
    );
  }

  if (action.type === 'DELAY_PURCHASE' && hasNonZeroNumber(action.delayDays)) {
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
