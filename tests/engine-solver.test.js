/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const {
  solveDecision,
  safeSolveDecisionForUser,
  generateCandidateActions,
  buildEngineContext,
  simulateAction,
  evaluateConstraintsForDecision,
  enforceHardConstraints,
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
    preferences: { profileId: 'BALANCED' },
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
  const originalError = console.error;
  const originalWarn = console.warn;
  const errorCalls = [];
  const warnCalls = [];

  console.error = (...args) => {
    errorCalls.push(args);
  };
  console.warn = (...args) => {
    warnCalls.push(args);
  };

  const outcome = await safeSolveDecisionForUser('user-1', ctx, {
    stateOverride: state,
    includeLegacyDecision: false,
  });

  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.reason, 'VALIDATION_ERROR');
  }

  if (process.env.NODE_ENV === 'test') {
    assert.equal(errorCalls.length, 0);
    assert.equal(warnCalls.length, 0);
  }

  console.error = originalError;
  console.warn = originalWarn;
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
        postedSpendCents: 1000,
        pendingSpendCents: 0,
        committedCents: 1000,
        remainingCents: 4000,
        period: 'MONTHLY',
        isEssential: false,
        strictMode: false,
      },
    ],
  });

  const ctx = buildStubContext();
  const projections = simulateAction(state, ctx, { type: 'USE_CARD', cardId: 'card-strong' });
  const bucketProj = projections.buckets.find((b) => b.bucketId === 'bucket-1');
  assert.equal(bucketProj?.projectedPostedSpendCents, 2000);
  assert.equal(bucketProj?.projectedCommittedCents, 2000);
}

function testGenerateCandidatesAddsAdvancedActions() {
  const state = buildStubState({
    debts: [
      {
        id: 'debt-1',
        name: 'Card Debt',
        type: 'CREDIT_CARD',
        balanceCents: 100_000,
        creditLimitCents: 200_000,
        aprPercent: 20,
        minPaymentCents: 2_000,
        dueDayOfMonth: 5,
      },
    ],
    cash: {
      liquidCents: 250_000,
      nextPaycheckDate: new Date('2024-01-15T00:00:00Z'),
      nextPaycheckNetCents: null,
    },
  });

  const ctx = buildStubContext({ amountCents: 20_000 });
  const actions = generateCandidateActions(state, ctx);
  const types = new Set(actions.map((a) => a.type));

  assert.ok(types.has('USE_CARD'));
  assert.ok(types.has('USE_CARD_WITH_PAYDOWN'));
  assert.ok(types.has('DELAY_PURCHASE'));
  assert.ok(types.has('REJECT_PURCHASE'));
}

function testPaydownGuardrailBlocksExcess() {
  const state = buildStubState({
    debts: [
      {
        id: 'debt-1',
        name: 'Card Debt',
        type: 'CREDIT_CARD',
        balanceCents: 50_000,
        creditLimitCents: 100_000,
        aprPercent: 20,
        minPaymentCents: 1_000,
        dueDayOfMonth: 10,
      },
    ],
    cash: { liquidCents: 2_000, nextPaycheckDate: null, nextPaycheckNetCents: null },
  });
  const ctx = buildStubContext({ amountCents: 10_000 });
  const action = { type: 'PAY_DOWN_DEBT', debtId: 'debt-1', paydownAmountCents: 5_000 };
  const projections = simulateAction(state, ctx, action);
  const breaches = evaluateConstraintsForDecision(state, ctx, action, projections);
  assert.ok(breaches.includes('HARD:PAYDOWN_EXCEEDS_LIQUID'));

  const kept = enforceHardConstraints([
    {
      actionId: 'paydown-test',
      action,
      score: 0,
      reasons: [],
      projections,
      constraintsBreached: breaches,
    },
  ]);
  assert.equal(kept.length, 0);
}

async function testCompositeActionImprovesDebtRelief() {
  const state = buildStubState({
    debts: [
      {
        id: 'debt-strong',
        name: 'Strong Card',
        type: 'CREDIT_CARD',
        balanceCents: 100_000,
        creditLimitCents: 200_000,
        aprPercent: 25,
        minPaymentCents: 2_000,
        dueDayOfMonth: 15,
      },
    ],
    cash: {
      liquidCents: 120_000,
      nextPaycheckDate: new Date('2024-01-15T00:00:00Z'),
      nextPaycheckNetCents: null,
    },
  });
  const ctx = buildStubContext({ amountCents: 10_000 });
  const result = await solveDecision(state, ctx);
  const plain = result.decisions.find(
    (d) => d.action.type === 'USE_CARD' && d.action.cardId === 'card-strong'
  );
  const composite = result.decisions.find(
    (d) => d.action.type === 'USE_CARD_WITH_PAYDOWN' && d.action.cardId === 'card-strong'
  );

  assert.ok(plain);
  assert.ok(composite);
  if (plain && composite) {
    assert.ok(composite.score > plain.score);
  }
}

async function testSolveDecisionRespondsToProfiles() {
  const state = buildStubState({
    cards: [
      {
        id: 'card-reward',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'Reward Card',
        network: 'VISA',
        productSlug: null,
        rewardRules: [
          {
            id: 'rule-reward',
            cardId: 'card-reward',
            categoryKey: 'DINING',
            rateType: 'CASHBACK',
            rateValue: 0.0001,
            confidence: 1,
            source: 'STATIC_CONFIG',
          },
        ],
        isCredit: false,
        isActive: true,
        isVirtual: false,
      },
      {
        id: 'card-debt',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'Debt Card',
        network: 'VISA',
        productSlug: null,
        rewardRules: [
          {
            id: 'rule-debt',
            cardId: 'card-debt',
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
    debts: [
      {
        id: 'debt-1',
        name: 'Debt',
        type: 'CREDIT_CARD',
        balanceCents: 20_000,
        creditLimitCents: 25_000,
        aprPercent: 20,
        minPaymentCents: 1_000,
        dueDayOfMonth: 5,
      },
    ],
    cash: { liquidCents: 20_000, nextPaycheckDate: null, nextPaycheckNetCents: null },
  });

  const ctx = buildStubContext({ amountCents: 10_000, surface: 'web' });

  const rewardsResult = await solveDecision(
    { ...state, preferences: { profileId: 'MAX_REWARDS' } },
    ctx
  );
  const debtResult = await solveDecision(
    { ...state, preferences: { profileId: 'KILL_DEBT' } },
    ctx
  );

  const rewardsTop = rewardsResult.decisions[0];
  const debtTop = debtResult.decisions[0];

  assert.equal(rewardsTop?.action.type, 'USE_CARD');
  assert.equal(rewardsTop?.action.cardId, 'card-reward');

  assert.ok(debtTop);
  assert.notEqual(debtTop?.actionId, rewardsTop?.actionId);
  assert.ok(
    debtTop?.action.type === 'USE_CARD_WITH_PAYDOWN' ||
      debtTop?.action.type === 'PAY_DOWN_DEBT'
  );
}

async function run() {
  await testSolveDecisionSorts();
  await testSolveDecisionValidation();
  await testSafeSolveDecisionSuccess();
  await testSafeSolveDecisionFailure();
  testGenerateCandidatesSkipsDisabled();
  testSimulateActionUpdatesBucket();
  testGenerateCandidatesAddsAdvancedActions();
  testPaydownGuardrailBlocksExcess();
  await testCompositeActionImprovesDebtRelief();
  await testSolveDecisionRespondsToProfiles();
  console.warn('engine solver: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
