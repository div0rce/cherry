/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const {
  solveDecision,
  safeSolveDecisionForUser,
  generateCandidateActions,
  buildEngineContext,
  EngineError,
} = require('../lib/engine');
const { DEFAULT_OBJECTIVE_WEIGHTS } = require('../lib/engine/objective');

function buildStubState(overrides = {}) {
  return {
    userId: 'user-1',
    buckets: [],
    debts: [],
    cash: { liquidCents: 10_000, nextPaycheckDate: null, nextPaycheckNetCents: null },
    cards: [
      {
        id: 'card-strong',
        issuer: 'Issuer',
        label: 'Strong Card',
        network: 'VISA',
        productSlug: null,
        rewards: [
          {
            categoryKey: 'DINING',
            rateType: 'POINTS_PER_DOLLAR',
            rateValue: 2,
            confidence: 1,
            source: 'STATIC_CONFIG',
          },
        ],
        isCredit: true,
        canUseForContext: true,
      },
      {
        id: 'card-weak',
        issuer: 'Issuer',
        label: 'Weak Card',
        network: 'VISA',
        productSlug: null,
        rewards: [
          {
            categoryKey: 'DINING',
            rateType: 'POINTS_PER_DOLLAR',
            rateValue: 1,
            confidence: 1,
            source: 'STATIC_CONFIG',
          },
        ],
        isCredit: true,
        canUseForContext: true,
      },
    ],
    preferences: {
      rewardsWeight: DEFAULT_OBJECTIVE_WEIGHTS.rewards,
      runwayWeight: DEFAULT_OBJECTIVE_WEIGHTS.runway,
      debtReliefWeight: DEFAULT_OBJECTIVE_WEIGHTS.debtRelief,
      volatilityPenaltyWeight: DEFAULT_OBJECTIVE_WEIGHTS.volatilityPenalty,
      ruleViolationPenaltyWeight: DEFAULT_OBJECTIVE_WEIGHTS.ruleViolationPenalty,
    },
    ...overrides,
  };
}

function buildStubLegacyDecision(cardId = 'card-strong') {
  return {
    category: 'DINING',
    amountCents: 1000,
    budget: {
      verdict: 'HEALTHY',
      coverageMode: 'UNCONFIGURED',
      hasBucket: false,
      bucketId: null,
      name: null,
      limitCents: null,
      spentBeforeCents: 0,
      spentAfterCents: 1000,
      remainingAfterCents: null,
      strictMode: false,
      wouldExceed: false,
    },
    card: {
      verdict: 'OPTIMAL',
      cardId,
      cardNickname: 'Stub Card',
      multiplier: 2,
      estimatedRewards: 20,
      hasCardData: true,
    },
    overallVerdict: 'GREEN',
    cherryIncentive: { pointsIfFollowed: 5, expiryMinutes: 15 },
  };
}

function buildStubContext(overrides = {}) {
  return buildEngineContext({
    surface: 'web',
    now: new Date('2024-01-01T00:00:00Z'),
    merchantCategoryKey: 'DINING',
    amountCents: 1000,
    ...overrides,
  });
}

async function testSolveDecisionSorts() {
  const state = buildStubState();
  const ctx = buildStubContext();
  const result = await solveDecision(state, ctx, {
    legacyEngineFn: async () => buildStubLegacyDecision('card-strong'),
  });

  assert.equal(result.decisions[0]?.action.cardId, 'card-strong');
}

async function testSolveDecisionValidation() {
  const state = buildStubState();
  const ctx = buildStubContext({ amountCents: -10 });

  await assert.rejects(
    () => solveDecision(state, ctx, { legacyEngineFn: async () => buildStubLegacyDecision() }),
    EngineError
  );
}

async function testSafeSolveDecisionSuccess() {
  const state = buildStubState();
  const ctx = buildStubContext();
  const outcome = await safeSolveDecisionForUser('user-1', ctx, {
    stateOverride: state,
    legacyEngineFn: async () => buildStubLegacyDecision('card-strong'),
  });

  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.ok(outcome.decisions.length > 0);
  }
}

async function testSafeSolveDecisionFailure() {
  const state = buildStubState();
  const ctx = buildStubContext();
  const outcome = await safeSolveDecisionForUser('user-1', ctx, {
    stateOverride: state,
    legacyEngineFn: async () => {
      throw new Error('boom');
    },
  });

  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.reason, 'ENGINE_ERROR');
  }
}

function testGenerateCandidatesSkipsDisabled() {
  const state = buildStubState({
    cards: [
      {
        id: 'skip-card',
        issuer: 'Issuer',
        label: 'Skip',
        rewards: [],
        isCredit: true,
        canUseForContext: false,
      },
      {
        id: 'use-card',
        issuer: 'Issuer',
        label: 'Use',
        rewards: [],
        isCredit: true,
        canUseForContext: true,
      },
    ],
  });

  const actions = generateCandidateActions(state);
  assert.ok(actions.every((a) => a.cardId !== 'skip-card'));
}

async function run() {
  await testSolveDecisionSorts();
  await testSolveDecisionValidation();
  await testSafeSolveDecisionSuccess();
  await testSafeSolveDecisionFailure();
  testGenerateCandidatesSkipsDisabled();
  console.warn('engine solver: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
