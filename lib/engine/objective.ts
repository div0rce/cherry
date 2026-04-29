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
import {
  OBJECTIVE_SCORE_UNIT,
  centsToUtilityCents,
  rewardPointsToUtilityCents,
  sumObjectiveUtility,
  utilityCents,
  type ObjectiveComponent,
  type UtilityCents,
} from './objective/utility.js';

export {
  OBJECTIVE_SCORE_UNIT,
  POINTS_PER_DOLLAR,
  REWARD_POINT_VALUE_CENTS,
  aggregateUtilitySamples,
  centsToUtilityCents,
  dollarsToUtilityCents,
  pointsToUtilityCents,
  rewardPointsToUtilityCents,
  sumObjectiveUtility,
  utilityCents,
  type ObjectiveComponent,
  type ObjectiveComponentKind,
  type ObjectiveScoreUnit,
  type UtilityResult,
  type UtilityCents,
} from './objective/utility.js';

export {
  DEFAULT_RISK_LAMBDA,
  riskAdjustedUtility,
} from './objective/risk.js';

export const UTILIZATION_RELIEF_UTILITY_CENTS_PER_BASIS_POINT = 0.0001;
export const DEBT_BALANCE_RELIEF_UTILITY_CENTS_PER_DEBT_CENT = 0.0001;
export const PAYDOWN_ACTION_BONUS_UTILITY_CENTS = 1;

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

type ObjectiveBuildResult = {
  objectiveUtilityCents: UtilityCents;
  scoreComponents: readonly ObjectiveComponent[];
  components: ObjectiveComponentScores;
  weights: ObjectiveWeights;
};

function weightedUtilityCents(value: UtilityCents, weight: number): UtilityCents {
  return utilityCents(Number(value) * weight);
}

function pushWeightedComponent(
  components: ObjectiveComponent[],
  params: {
    key: string;
    kind: ObjectiveComponent['kind'];
    rawUtilityCents: UtilityCents;
    weight: number;
    interpretation: string;
    boundedHeuristic?: boolean;
  }
): UtilityCents {
  const utilityCentsValue = weightedUtilityCents(params.rawUtilityCents, params.weight);
  if (utilityCentsValue === 0) return utilityCentsValue;
  components.push({
    key: params.key,
    kind: params.kind,
    utilityCents: utilityCentsValue,
    interpretation: params.interpretation,
    ...(params.boundedHeuristic === true ? { boundedHeuristic: true } : {}),
  });
  return utilityCentsValue;
}

function basisPoints(delta: number): number {
  return delta * 10_000;
}

function buildObjective(
  state: EngineState,
  ctx: EngineContext,
  action: EngineAction,
  projections: {
    buckets: BucketProjection[];
    debt: DebtProjection[];
    cash: CashProjection;
  },
  weights: ObjectiveWeights
): ObjectiveBuildResult {
  const normalizedWeights = normalizeObjectiveWeights(weights);
  const scoreComponents: ObjectiveComponent[] = [];
  const components: ObjectiveComponentScores = {
    rewards: 0,
    runway: 0,
    debtRelief: 0,
  };

  // 1) Reward estimate. Points are explicitly valued before entering the objective.
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
      if (rewardSemantics?.rewardUnit === 'cashback_cents') {
        const rewardValueCents = centsToUtilityCents(centsOrZero(rewardSemantics.rewardValueCents));
        components.rewards = Number(rewardValueCents);
        pushWeightedComponent(scoreComponents, {
          key: 'reward_value',
          kind: 'reward_value',
          rawUtilityCents: rewardValueCents,
          weight: normalizedWeights.rewards,
          interpretation:
            'Cashback reward value converted at face value into objectiveUtilityCents and multiplied by the rewards preference weight.',
        });
      } else if (rewardSemantics?.rewardUnit === 'issuer_points') {
        const rewardPoints =
          rewardSemantics.rewardPoints == null ? 0 : rewardSemantics.rewardPoints;
        const rewardValueCents = rewardPointsToUtilityCents(rewardPoints);
        components.rewards = Number(rewardValueCents);
        pushWeightedComponent(scoreComponents, {
          key: 'reward_point_value',
          kind: 'reward_value',
          rawUtilityCents: rewardValueCents,
          weight: normalizedWeights.rewards,
          interpretation:
            'Issuer points converted through REWARD_POINT_VALUE_CENTS into objectiveUtilityCents and multiplied by the rewards preference weight.',
        });
      }
    }
  }

  // 2) Runway: bounded heuristic pressure for essential liquidity margin.
  let essentialMarginUtilityCents = 0;
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
        essentialMarginUtilityCents += proj.projectedRemainingCents;
      }
    }
  }
  if (essentialMarginUtilityCents !== 0) {
    components.runway += essentialMarginUtilityCents;
    pushWeightedComponent(scoreComponents, {
      key: 'essential_margin_runway',
      kind: 'liquidity_pressure',
      rawUtilityCents: utilityCents(essentialMarginUtilityCents),
      weight: normalizedWeights.runway,
      interpretation:
        'Bounded non-utility heuristic for projected essential bucket margin, multiplied by the runway preference weight.',
      boundedHeuristic: true,
    });
  }

  // 3) Debt relief: bounded utility-adjusted contribution with explicit constants.
  let utilizationReliefUtilityCents = 0;
  let balanceReliefUtilityCents = 0;
  let paydownActionUtilityCents = 0;
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
        utilizationReliefUtilityCents +=
          basisPoints(currentUtil - proj.projectedUtilization) *
          UTILIZATION_RELIEF_UTILITY_CENTS_PER_BASIS_POINT;
      } else {
        const balanceDelta = debt.balanceCents - proj.projectedBalanceCents;
        balanceReliefUtilityCents +=
          balanceDelta * DEBT_BALANCE_RELIEF_UTILITY_CENTS_PER_DEBT_CENT;
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
    paydownActionUtilityCents += PAYDOWN_ACTION_BONUS_UTILITY_CENTS;
  }
  const debtRelief =
    utilizationReliefUtilityCents + balanceReliefUtilityCents + paydownActionUtilityCents;
  if (debtRelief !== 0) {
    components.debtRelief = Number(utilityCents(debtRelief));
    pushWeightedComponent(scoreComponents, {
      key: 'debt_relief',
      kind: 'debt_relief',
      rawUtilityCents: utilityCents(debtRelief),
      weight: normalizedWeights.debtRelief,
      interpretation:
        'Debt relief converted through explicit utilization and balance-relief utility constants, then multiplied by the debt-relief preference weight.',
      boundedHeuristic: true,
    });
  }

  if (action.type === 'DELAY_PURCHASE' && hasNonZeroNumber(ctx.amountCents)) {
    const delayPenalty = -0.01 * ctx.amountCents;
    components.runway += delayPenalty;
    pushWeightedComponent(scoreComponents, {
      key: 'delay_purchase_liquidity_pressure',
      kind: 'liquidity_pressure',
      rawUtilityCents: utilityCents(delayPenalty),
      weight: normalizedWeights.runway,
      interpretation:
        'Bounded non-utility penalty used to discourage fragile near-term liquidity outcomes from delaying the purchase.',
      boundedHeuristic: true,
    });
  }

  if (action.type === 'REJECT_PURCHASE' && hasNonZeroNumber(ctx.amountCents)) {
    const rejectPenalty = -0.05 * ctx.amountCents;
    components.runway += rejectPenalty;
    pushWeightedComponent(scoreComponents, {
      key: 'reject_purchase_liquidity_pressure',
      kind: 'liquidity_pressure',
      rawUtilityCents: utilityCents(rejectPenalty),
      weight: normalizedWeights.runway,
      interpretation:
        'Bounded non-utility penalty used to represent the friction of rejecting the purchase while protecting constraints.',
      boundedHeuristic: true,
    });
  }

  const objectiveUtilityCents = sumObjectiveUtility(scoreComponents);
  return {
    objectiveUtilityCents,
    scoreComponents,
    components,
    weights: normalizedWeights,
  };
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
): {
  score: number;
  objectiveUtilityCents: UtilityCents;
  scoreUnit: typeof OBJECTIVE_SCORE_UNIT;
  scoreComponents: readonly ObjectiveComponent[];
  reasons: string[];
  components: ObjectiveComponentScores;
  weights: ObjectiveWeights;
} {
  const resolvedWeights = weights == null ? getObjectiveWeightsForState(state) : weights;
  const objective = buildObjective(state, ctx, action, projections, resolvedWeights);

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
      `Estimated cashback objective value: $${formatCentsAsDollars(rewardValueCents)} before preference weighting.`
    );
  } else if (rewardPoints > 0) {
    const pointUtilityCents = rewardPointsToUtilityCents(rewardPoints);
    reasons.push(
      `Estimated issuer point objective value: $${formatCentsAsDollars(pointUtilityCents)} using REWARD_POINT_VALUE_CENTS.`
    );
  }

  if (objective.components.runway !== 0) {
    reasons.push(
      'Applied bounded liquidity-pressure heuristic in objectiveUtilityCents.'
    );
  }

  if (objective.components.debtRelief !== 0) {
    reasons.push(
      'Applied bounded debt-relief contribution through documented utility constants.'
    );
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

  return {
    score: objective.objectiveUtilityCents,
    objectiveUtilityCents: objective.objectiveUtilityCents,
    scoreUnit: OBJECTIVE_SCORE_UNIT,
    scoreComponents: objective.scoreComponents,
    reasons,
    components: objective.components,
    weights: objective.weights,
  };
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
): {
  score: number;
  objectiveUtilityCents: UtilityCents;
  scoreUnit: typeof OBJECTIVE_SCORE_UNIT;
  scoreComponents: readonly ObjectiveComponent[];
  components: ObjectiveComponentScores;
} {
  const objective = buildObjective(state, ctx, action, projections, weights);
  return {
    score: objective.objectiveUtilityCents,
    objectiveUtilityCents: objective.objectiveUtilityCents,
    scoreUnit: OBJECTIVE_SCORE_UNIT,
    scoreComponents: objective.scoreComponents,
    components: objective.components,
  };
}
