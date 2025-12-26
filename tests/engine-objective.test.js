/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const {
  OBJECTIVE_PROFILES,
  DEFAULT_OBJECTIVE_WEIGHTS,
  getObjectiveProfileById,
  getObjectiveWeightsForPreferences,
  mergeProfileWithOverrides,
  normalizeObjectiveWeights,
  scoreAction,
} = require('../lib/engine/objective');
const { buildEngineContext } = require('../lib/engine');

function buildStateForObjectives() {
  return {
    userId: 'user-obj',
    buckets: [],
    debts: [
      {
        id: 'debt-1',
        name: 'Debt',
        type: 'CREDIT_CARD',
        balanceCents: 5_000,
        creditLimitCents: 10_000,
        aprPercent: null,
        minPaymentCents: null,
        dueDayOfMonth: null,
      },
    ],
    constraints: {
      hard: {
        minEssentialCoverageDays: 0,
        maxCardUtilization: null,
      },
      soft: {
        avoidInterest: false,
        avoidNewDebt: false,
      },
    },
    world: { baseInterestRate: null, inflationEstimate: null },
    cash: { liquidCents: 5_000, nextPaycheckDateMs: null, nextPaycheckNetCents: null },
    preferences: { profileId: 'BALANCED' },
    cards: [
      {
        id: 'card-high',
        userId: 'user-obj',
        issuer: 'Issuer',
        label: 'High Rewards',
        network: 'VISA',
        productSlug: null,
        rewardRules: [
          {
            id: 'rule-high',
            cardId: 'card-high',
            categoryKey: 'DINING',
            rateType: 'CASHBACK',
            rateValue: 0.05,
            confidence: 1,
            source: 'STATIC_CONFIG',
          },
        ],
        isCredit: true,
        isActive: true,
        isVirtual: false,
      },
      {
        id: 'card-low',
        userId: 'user-obj',
        issuer: 'Issuer',
        label: 'Debt Relief',
        network: 'VISA',
        productSlug: null,
        rewardRules: [
          {
            id: 'rule-low',
            cardId: 'card-low',
            categoryKey: 'DINING',
            rateType: 'CASHBACK',
            rateValue: 0,
            confidence: 1,
            source: 'STATIC_CONFIG',
          },
        ],
        isCredit: true,
        isActive: true,
        isVirtual: false,
      },
    ],
  };
}

function testProfileFallback() {
  const known = getObjectiveProfileById('MAX_REWARDS');
  assert.equal(known.id, 'MAX_REWARDS');

  const fallback = getObjectiveProfileById('NOT_A_PROFILE');
  assert.equal(fallback.id, 'BALANCED');
}

function testNormalizeClampsInvalid() {
  const normalized = normalizeObjectiveWeights({
    rewards: 1,
    runway: -1,
    debtRelief: Number.NaN,
    volatility: Number.POSITIVE_INFINITY,
    ruleViolations: -0.5,
  });

  assert.deepEqual(normalized, {
    rewards: 1,
    runway: 0,
    debtRelief: 0,
    volatility: 0,
    ruleViolations: 0,
  });
}

function testMergeOverridesApply() {
  const merged = mergeProfileWithOverrides(OBJECTIVE_PROFILES.BALANCED, {
    rewards: 2,
    volatility: 5,
  });

  assert.equal(merged.rewards, 2);
  assert.equal(merged.volatility, 5);
  assert.equal(merged.runway, OBJECTIVE_PROFILES.BALANCED.weights.runway);
}

function testPreferencesFallback() {
  const weights = getObjectiveWeightsForPreferences(null);
  assert.deepEqual(weights, DEFAULT_OBJECTIVE_WEIGHTS);
}

function testWeightsShiftRanking() {
  const state = buildStateForObjectives();
  const ctx = buildEngineContext({
    surface: 'web',
    nowMs: new Date('2024-02-01T00:00:00Z').getTime(),
    merchantCategoryKey: 'DINING',
    amountCents: 100,
  });

  const rewardAction = { type: 'USE_CARD', cardId: 'card-high' };
  const rewardProjections = {
    buckets: [],
    debt: [
      {
        debtId: 'debt-1',
        projectedBalanceCents: 5_000,
        projectedUtilization: 0.5,
      },
    ],
    cash: { projectedLiquidCents: 5_000, projectedOverdraftRisk: null },
  };

  const debtAction = {
    type: 'USE_CARD_WITH_PAYDOWN',
    cardId: 'card-low',
    debtId: 'debt-1',
    paydownAmountCents: 500,
  };
  const debtProjections = {
    buckets: [],
    debt: [
      {
        debtId: 'debt-1',
        projectedBalanceCents: 4_500,
        projectedUtilization: -6,
      },
    ],
    cash: { projectedLiquidCents: 4_500, projectedOverdraftRisk: null },
  };

  const maxRewardWeights = OBJECTIVE_PROFILES.MAX_REWARDS.weights;
  const killDebtWeights = OBJECTIVE_PROFILES.KILL_DEBT.weights;

  const rewardFirst = scoreAction(state, ctx, rewardAction, rewardProjections, maxRewardWeights);
  const debtFirst = scoreAction(state, ctx, debtAction, debtProjections, maxRewardWeights);
  assert.ok(rewardFirst.score > debtFirst.score);

  const rewardUnderDebt = scoreAction(state, ctx, rewardAction, rewardProjections, killDebtWeights);
  const debtUnderDebt = scoreAction(state, ctx, debtAction, debtProjections, killDebtWeights);
  assert.ok(debtUnderDebt.score > rewardUnderDebt.score);
}

async function run() {
  testProfileFallback();
  testNormalizeClampsInvalid();
  testMergeOverridesApply();
  testPreferencesFallback();
  testWeightsShiftRanking();
  console.warn('engine objective: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
