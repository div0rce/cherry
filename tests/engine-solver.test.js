/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const {
  solveDecision,
  safeSolveDecisionForUser,
  generateCandidateActions,
  buildEngineContext,
  simulateAction,
  EngineError,
} = require('../lib/engine');

function buildStubState(overrides = {}) {
  return {
    userId: 'user-1',
    buckets: [],
    debts: [],
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
    cash: { liquidCents: 10_000, nextPaycheckDate: null, nextPaycheckNetCents: null },
    cards: [
      {
        id: 'card-strong',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'Strong Card',
        network: 'VISA',
        productSlug: null,
        rewardRules: [
          {
            id: 'rule-1',
            cardId: 'card-strong',
            categoryKey: 'DINING',
            rateType: 'POINTS_PER_DOLLAR',
            rateValue: 2,
            confidence: 1,
            source: 'STATIC_CONFIG',
          },
        ],
        isCredit: true,
        isActive: true,
        isVirtual: false,
      },
      {
        id: 'card-weak',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'Weak Card',
        network: 'VISA',
        productSlug: null,
        rewardRules: [
          {
            id: 'rule-2',
            cardId: 'card-weak',
            categoryKey: 'DINING',
            rateType: 'POINTS_PER_DOLLAR',
            rateValue: 1,
            confidence: 1,
            source: 'STATIC_CONFIG',
          },
        ],
        isCredit: true,
        isActive: true,
        isVirtual: false,
      },
    ],
    ...overrides,
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
  const result = await solveDecision(state, ctx);

  assert.equal(result.decisions[0]?.action.cardId, 'card-strong');
}

async function testSolveDecisionValidation() {
  const state = buildStubState();
  const ctx = buildStubContext({ amountCents: -10 });

  await assert.rejects(
    () => solveDecision(state, ctx),
    EngineError
  );
}

async function testSafeSolveDecisionSuccess() {
  const state = buildStubState();
  const ctx = buildStubContext();
  const outcome = await safeSolveDecisionForUser('user-1', ctx, {
    stateOverride: state,
    includeLegacyDecision: false,
  });

  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.ok(outcome.decisions.length > 0);
  }
}

async function testSafeSolveDecisionFailure() {
  const state = buildStubState();
  const ctx = buildStubContext({ amountCents: -5 });
  const outcome = await safeSolveDecisionForUser('user-1', ctx, {
    stateOverride: state,
    includeLegacyDecision: false,
  });

  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.reason, 'VALIDATION_ERROR');
  }
}

function testGenerateCandidatesSkipsDisabled() {
  const state = buildStubState({
    cards: [
      {
        id: 'skip-card',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'Skip',
        rewardRules: [],
        isCredit: true,
        isActive: false,
        isVirtual: false,
      },
      {
        id: 'use-card',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'Use',
        rewardRules: [],
        isCredit: true,
        isActive: true,
        isVirtual: false,
      },
    ],
  });

  const ctx = buildStubContext();
  const actions = generateCandidateActions(state, ctx);
  assert.ok(actions.every((a) => a.cardId !== 'skip-card'));
}

function testSimulateActionUpdatesBucket() {
  const state = buildStubState({
    buckets: [
      {
        id: 'bucket-1',
        name: 'Dining',
        categoryKey: 'DINING',
        limitCents: 5000,
        spentCents: 1000,
        period: 'MONTHLY',
        isEssential: false,
        strictMode: false,
      },
    ],
  });

  const ctx = buildStubContext();
  const projections = simulateAction(state, ctx, { type: 'USE_CARD', cardId: 'card-strong' });
  const bucketProj = projections.buckets.find((b) => b.bucketId === 'bucket-1');
  assert.equal(bucketProj?.projectedSpentCents, 2000);
}

async function run() {
  await testSolveDecisionSorts();
  await testSolveDecisionValidation();
  await testSafeSolveDecisionSuccess();
  await testSafeSolveDecisionFailure();
  testGenerateCandidatesSkipsDisabled();
  testSimulateActionUpdatesBucket();
  console.warn('engine solver: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
