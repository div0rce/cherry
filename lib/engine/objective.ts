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
  validateRiskLambda,
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
export type ObjectiveProjections = {
  buckets: BucketProjection[];
  debt: DebtProjection[];
  cash: CashProjection;
};

export type ObjectiveScenario = {
  state: EngineState;
  ctx: EngineContext;
  action: EngineAction;
  projections: ObjectiveProjections;
};

type ObjectiveAccumulator = {
  scoreComponents: ObjectiveComponent[];
  components: ObjectiveComponentScores;
  weights: ObjectiveWeights;
};

function isCardSpendAction(action: EngineAction): boolean {
  if (action.type === 'USE_CARD') return true;
  return action.type === 'USE_CARD_WITH_PAYDOWN';
}

function isPaydownAction(action: EngineAction): boolean {
  if (action.type === 'PAY_DOWN_DEBT') return true;
  return action.type === 'USE_CARD_WITH_PAYDOWN';
}

function paydownAmountOf(action: EngineAction): number | null {
  if (!isPaydownAction(action)) return null;
  return hasNonZeroNumber(action.paydownAmountCents) ? action.paydownAmountCents : null;
}

function addCashbackReward(acc: ObjectiveAccumulator, rewardValueCentsInput?: number | null): void {
  const rewardValueCents = centsToUtilityCents(centsOrZero(rewardValueCentsInput));
  acc.components.rewards = Number(rewardValueCents);
  pushWeightedComponent(acc.scoreComponents, {
    key: 'reward_value',
    kind: 'reward_value',
    rawUtilityCents: rewardValueCents,
    weight: acc.weights.rewards,
    interpretation:
      'Cashback reward value converted at face value into objectiveUtilityCents and multiplied by the rewards preference weight.',
  });
}

function addIssuerPointsReward(acc: ObjectiveAccumulator, rewardPointsInput?: number | null): void {
  const rewardPoints = rewardPointsInput == null ? 0 : rewardPointsInput;
  const rewardValueCents = rewardPointsToUtilityCents(rewardPoints);
  acc.components.rewards = Number(rewardValueCents);
  pushWeightedComponent(acc.scoreComponents, {
    key: 'reward_point_value',
    kind: 'reward_value',
    rawUtilityCents: rewardValueCents,
    weight: acc.weights.rewards,
    interpretation:
      'Issuer points converted through REWARD_POINT_VALUE_CENTS into objectiveUtilityCents and multiplied by the rewards preference weight.',
  });
}

function findRewardCard(scenario: ObjectiveScenario): EngineState['cards'][number] | undefined {
  const { state, ctx, action } = scenario;
  if (!isCardSpendAction(action)) return undefined;
  if (!hasNonEmptyString(action.cardId)) return undefined;
  if (!hasNonZeroNumber(ctx.amountCents)) return undefined;
  return state.cards.find((c) => c.id === action.cardId);
}

// 1) Reward estimate. Points are explicitly valued before entering the objective.
function addRewardComponent(acc: ObjectiveAccumulator, scenario: ObjectiveScenario): void {
  const card = findRewardCard(scenario);
  if (card === undefined) return;
  const rewardSemantics = getRewardSemanticsForCardSpend({
    card,
    amountCents: scenario.ctx.amountCents,
    merchantCategoryKey: scenario.ctx.merchantCategoryKey,
  });
  if (rewardSemantics?.rewardUnit === 'cashback_cents') {
    addCashbackReward(acc, rewardSemantics.rewardValueCents);
  } else if (rewardSemantics?.rewardUnit === 'issuer_points') {
    addIssuerPointsReward(acc, rewardSemantics.rewardPoints);
  }
}

function countsTowardEssentialMargin(bucket: EngineState['buckets'][number]): boolean {
  if (!hasKnownBucketEssentiality(bucket)) return false;
  if (!isBucketEssential(bucket)) return false;
  return bucket.limitCents != null;
}

function sumEssentialMarginUtilityCents(scenario: ObjectiveScenario): number {
  let essentialMarginUtilityCents = 0;
  for (const proj of scenario.projections.buckets) {
    const bucket = scenario.state.buckets.find((b) => b.id === proj.bucketId);
    if (bucket === undefined) continue;
    if (countsTowardEssentialMargin(bucket)) {
      essentialMarginUtilityCents += proj.projectedRemainingCents;
    }
  }
  return essentialMarginUtilityCents;
}

// 2) Runway: bounded heuristic pressure for essential liquidity margin.
function addRunwayComponent(
  acc: ObjectiveAccumulator,
  scenario: ObjectiveScenario,
  capabilities: ReturnType<typeof getEngineCapabilities>
): void {
  const essentialMarginUtilityCents =
    capabilities.essentiality.available === true ? sumEssentialMarginUtilityCents(scenario) : 0;
  if (essentialMarginUtilityCents === 0) return;
  acc.components.runway += essentialMarginUtilityCents;
  pushWeightedComponent(acc.scoreComponents, {
    key: 'essential_margin_runway',
    kind: 'liquidity_pressure',
    rawUtilityCents: utilityCents(essentialMarginUtilityCents),
    weight: acc.weights.runway,
    interpretation:
      'Bounded non-utility heuristic for projected essential bucket margin, multiplied by the runway preference weight.',
    boundedHeuristic: true,
  });
}

function currentUtilizationOf(debt: ReturnType<typeof getDebtAccounts>[number]): number | null {
  const limit = debt.creditLimitCents;
  if (limit == null) return null;
  if (!(limit > 0)) return null;
  return debt.balanceCents / limit;
}

function utilizationDeltaOf(
  projectedUtilization: number | null | undefined,
  currentUtil: number | null,
  utilizationAvailable: boolean
): number | null {
  if (!utilizationAvailable) return null;
  if (projectedUtilization == null) return null;
  if (currentUtil == null) return null;
  return currentUtil - projectedUtilization;
}

type DebtReliefTotals = {
  utilizationReliefUtilityCents: number;
  balanceReliefUtilityCents: number;
};

function sumDebtRelief(
  scenario: ObjectiveScenario,
  capabilities: ReturnType<typeof getEngineCapabilities>
): DebtReliefTotals {
  const totals: DebtReliefTotals = { utilizationReliefUtilityCents: 0, balanceReliefUtilityCents: 0 };
  const debts = getDebtAccounts(scenario.state.debts);
  const utilizationAvailable = capabilities.utilization.available === true;
  for (const proj of scenario.projections.debt) {
    const debt = debts.find((d) => d.id === proj.debtId);
    if (debt === undefined) continue;
    const utilizationDelta = utilizationDeltaOf(
      proj.projectedUtilization,
      currentUtilizationOf(debt),
      utilizationAvailable
    );
    if (utilizationDelta !== null) {
      totals.utilizationReliefUtilityCents +=
        basisPoints(utilizationDelta) * UTILIZATION_RELIEF_UTILITY_CENTS_PER_BASIS_POINT;
    } else {
      const balanceDelta = debt.balanceCents - proj.projectedBalanceCents;
      totals.balanceReliefUtilityCents +=
        balanceDelta * DEBT_BALANCE_RELIEF_UTILITY_CENTS_PER_DEBT_CENT;
    }
  }
  return totals;
}

// 3) Debt relief: bounded utility-adjusted contribution with explicit constants.
function addDebtReliefComponent(
  acc: ObjectiveAccumulator,
  scenario: ObjectiveScenario,
  capabilities: ReturnType<typeof getEngineCapabilities>
): void {
  const totals: DebtReliefTotals =
    capabilities.debt.available === true
      ? sumDebtRelief(scenario, capabilities)
      : { utilizationReliefUtilityCents: 0, balanceReliefUtilityCents: 0 };
  let paydownActionUtilityCents = 0;
  if (paydownAmountOf(scenario.action) !== null) {
    paydownActionUtilityCents += PAYDOWN_ACTION_BONUS_UTILITY_CENTS;
  }
  const debtRelief =
    totals.utilizationReliefUtilityCents +
    totals.balanceReliefUtilityCents +
    paydownActionUtilityCents;
  if (debtRelief === 0) return;
  acc.components.debtRelief = Number(utilityCents(debtRelief));
  pushWeightedComponent(acc.scoreComponents, {
    key: 'debt_relief',
    kind: 'debt_relief',
    rawUtilityCents: utilityCents(debtRelief),
    weight: acc.weights.debtRelief,
    interpretation:
      'Debt relief converted through explicit utilization and balance-relief utility constants, then multiplied by the debt-relief preference weight.',
    boundedHeuristic: true,
  });
}

type PurchasePenaltySpec = {
  rate: number;
  key: string;
  interpretation: string;
};

const PURCHASE_PENALTIES: Partial<Record<EngineAction['type'], PurchasePenaltySpec>> = {
  DELAY_PURCHASE: {
    rate: -0.01,
    key: 'delay_purchase_liquidity_pressure',
    interpretation:
      'Bounded non-utility penalty used to discourage fragile near-term liquidity outcomes from delaying the purchase.',
  },
  REJECT_PURCHASE: {
    rate: -0.05,
    key: 'reject_purchase_liquidity_pressure',
    interpretation:
      'Bounded non-utility penalty used to represent the friction of rejecting the purchase while protecting constraints.',
  },
};

function addPurchasePenaltyComponent(acc: ObjectiveAccumulator, scenario: ObjectiveScenario): void {
  const spec = PURCHASE_PENALTIES[scenario.action.type];
  if (spec === undefined) return;
  const amountCents = scenario.ctx.amountCents;
  if (!hasNonZeroNumber(amountCents)) return;
  const penalty = spec.rate * amountCents;
  acc.components.runway += penalty;
  pushWeightedComponent(acc.scoreComponents, {
    key: spec.key,
    kind: 'liquidity_pressure',
    rawUtilityCents: utilityCents(penalty),
    weight: acc.weights.runway,
    interpretation: spec.interpretation,
    boundedHeuristic: true,
  });
}

function buildObjective(scenario: ObjectiveScenario, weights: ObjectiveWeights): ObjectiveBuildResult {
  const acc: ObjectiveAccumulator = {
    scoreComponents: [],
    components: {
      rewards: 0,
      runway: 0,
      debtRelief: 0,
    },
    weights: normalizeObjectiveWeights(weights),
  };

  addRewardComponent(acc, scenario);
  const capabilities = getEngineCapabilities(scenario.state);
  addRunwayComponent(acc, scenario, capabilities);
  addDebtReliefComponent(acc, scenario, capabilities);
  addPurchasePenaltyComponent(acc, scenario);

  const objectiveUtilityCents = sumObjectiveUtility(acc.scoreComponents);
  return {
    objectiveUtilityCents,
    scoreComponents: acc.scoreComponents,
    components: acc.components,
    weights: acc.weights,
  };
}

function cardSpendRewardSemantics(scenario: ObjectiveScenario) {
  const { state, ctx, action } = scenario;
  if (!isCardSpendAction(action) || !hasNonEmptyString(action.cardId)) return null;
  return getRewardSemanticsForCardSpend({
    card: state.cards.find((card) => card.id === action.cardId),
    amountCents: ctx.amountCents,
    merchantCategoryKey: ctx.merchantCategoryKey,
  });
}

function pushRewardReason(reasons: string[], scenario: ObjectiveScenario): void {
  const rewardSemantics = cardSpendRewardSemantics(scenario);
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
}

function pushComponentReasons(reasons: string[], components: ObjectiveComponentScores): void {
  if (components.runway !== 0) {
    reasons.push('Applied bounded liquidity-pressure heuristic in objectiveUtilityCents.');
  }
  if (components.debtRelief !== 0) {
    reasons.push('Applied bounded debt-relief contribution through documented utility constants.');
  }
}

const ACTION_TYPE_REASONS: Partial<Record<EngineAction['type'], string>> = {
  SWITCH_MERCHANT: 'Suggests an alternate merchant in the same category to save cost.',
  REJECT_PURCHASE: 'Recommends skipping this purchase to protect constraints.',
};

function pushActionReasons(reasons: string[], action: EngineAction): void {
  const paydownAmountCents = paydownAmountOf(action);
  if (paydownAmountCents !== null) {
    reasons.push(`Includes a paydown of ${formatCentsAsDollars(paydownAmountCents)} toward debt.`);
  }
  if (action.type === 'DELAY_PURCHASE' && hasNonZeroNumber(action.delayDays)) {
    reasons.push(`Delays purchase by ${action.delayDays} day(s) to reduce near-term risk.`);
  }
  const typeReason = ACTION_TYPE_REASONS[action.type];
  if (typeReason !== undefined) {
    reasons.push(typeReason);
  }
}

// Main scoring function that returns a scalar + human-readable reasons.
export function scoreDecision(
  scenario: ObjectiveScenario,
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
  const resolvedWeights = weights == null ? getObjectiveWeightsForState(scenario.state) : weights;
  const objective = buildObjective(scenario, resolvedWeights);

  const reasons: string[] = [];
  pushRewardReason(reasons, scenario);
  pushComponentReasons(reasons, objective.components);
  pushActionReasons(reasons, scenario.action);

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
  scenario: ObjectiveScenario,
  weights: ObjectiveWeights
): {
  score: number;
  objectiveUtilityCents: UtilityCents;
  scoreUnit: typeof OBJECTIVE_SCORE_UNIT;
  scoreComponents: readonly ObjectiveComponent[];
  components: ObjectiveComponentScores;
} {
  const objective = buildObjective(scenario, weights);
  return {
    score: objective.objectiveUtilityCents,
    objectiveUtilityCents: objective.objectiveUtilityCents,
    scoreUnit: OBJECTIVE_SCORE_UNIT,
    scoreComponents: objective.scoreComponents,
    components: objective.components,
  };
}
