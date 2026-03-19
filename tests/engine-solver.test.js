import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const {
  available,
  solveDecision,
  safeSolveDecisionForUser,
  generateCandidateActions,
  buildEngineContext,
  simulateAction,
  evaluateConstraintsForDecision,
  enforceHardConstraints,
  EngineError,
  createLoadedEngineCapabilities,
  createUnavailableEngineCapabilities,
  getEngineRuntimeMetadata,
  unavailable,
} = require('../lib/engine');

function buildStubState(overrides = {}) {
  const { debts: debtOverride, cash: cashOverride, ...restOverrides } = overrides;
  const debts =
    debtOverride === undefined
      ? available([])
      : Array.isArray(debtOverride)
        ? available(debtOverride)
        : debtOverride;
  const cash =
    cashOverride === undefined
      ? available({ liquidCents: 10_000, nextPaycheckDateMs: null, nextPaycheckNetCents: null })
      : cashOverride === null
        ? unavailable()
        : cashOverride.kind
          ? cashOverride
          : available(cashOverride);
  return {
    userId: 'user-1',
    buckets: [],
    debts,
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
    cash,
    capabilities: createLoadedEngineCapabilities(),
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
    ...restOverrides,
  };
}

function buildStubContext(overrides = {}) {
  return buildEngineContext({
    surface: 'web',
    nowMs: new Date('2024-01-01T00:00:00Z').getTime(),
    merchantCategoryKey: 'DINING',
    amountCents: 1000,
    ...overrides,
  });
}

function assertAccountingDecisions(decisions) {
  assert.ok(decisions.length > 0);
  for (const decision of decisions) {
    assert.ok(decision.accounting, 'expected accounting proof on decision');
    assert.ok(Array.isArray(decision.accounting.proposedTxns), 'expected proposedTxns array');
    assert.ok(Array.isArray(decision.accounting.proof), 'expected proof array');
  }
}

function summarizeAccounting(decisions) {
  return decisions.map((decision) => ({
    actionId: decision.actionId,
    accounting: decision.accounting,
  }));
}

async function testSolveDecisionSorts() {
  const state = buildStubState({
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
            rateType: 'CASHBACK',
            rateValue: 0.02,
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
            rateType: 'CASHBACK',
            rateValue: 0.01,
            confidence: 1,
            source: 'STATIC_CONFIG',
          },
        ],
        isCredit: true,
        isActive: true,
        isVirtual: false,
      },
    ],
  });
  const ctx = buildStubContext();
  const result = await solveDecision(state, ctx);
  const bestCardDecision = result.decisions.find((decision) => decision.action.type === 'USE_CARD');
  assert.equal(bestCardDecision?.action.cardId, 'card-strong');
}

async function testDeterministicOrderingForEqualScores() {
  const state = buildStubState({
    cards: [
      {
        id: 'card-b',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'B Card',
        network: 'VISA',
        productSlug: null,
        rewardRules: [
          {
            id: 'rule-b',
            cardId: 'card-b',
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
      {
        id: 'card-a',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'A Card',
        network: 'VISA',
        productSlug: null,
        rewardRules: [
          {
            id: 'rule-a',
            cardId: 'card-a',
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
  });
  const ctx = buildStubContext({ amountCents: 1_000 });
  const result = await solveDecision(state, ctx);
  const useCardDecisions = result.decisions.filter((d) => d.action.type === 'USE_CARD');

  assert.ok(useCardDecisions.length >= 2);
  assert.equal(useCardDecisions[0]?.action.cardId, 'card-a');
  assert.equal(useCardDecisions[1]?.action.cardId, 'card-b');
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

async function testSafeSolveDecisionAccountingContract() {
  const state = buildStubState();
  const ctx = buildStubContext();
  const outcome = await safeSolveDecisionForUser('user-1', ctx, {
    stateOverride: state,
    includeLegacyDecision: false,
  });

  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assertAccountingDecisions(outcome.decisions);
    const unsafe = outcome.decisions.filter((decision) => decision.accounting.proof.length > 0);
    assert.equal(unsafe.length, 0);
  }
}

async function testSafeSolveDecisionAccountingDeterministic() {
  const state = buildStubState();
  const ctx = buildStubContext();
  const first = await safeSolveDecisionForUser('user-1', ctx, {
    stateOverride: state,
    includeLegacyDecision: false,
  });
  const second = await safeSolveDecisionForUser('user-1', ctx, {
    stateOverride: state,
    includeLegacyDecision: false,
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (first.ok && second.ok) {
    assert.deepEqual(
      summarizeAccounting(first.decisions),
      summarizeAccounting(second.decisions)
    );
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
    runtime: { enableLogs: false },
  });

  assert.equal(outcome.ok, false);
  if (outcome.ok !== true) {
    assert.equal(outcome.reason, 'VALIDATION_ERROR');
    assert.deepEqual(outcome.capabilities, createLoadedEngineCapabilities());
    assert.deepEqual(outcome.degraded, {
      essentialProtection: false,
      debtPressure: false,
      liquidity: false,
      utilization: false,
    });
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
  assert.equal(bucketProj?.projectedPostedSpendCents, 1000);
  assert.equal(bucketProj?.projectedPendingSpendCents, 1000);
  assert.equal(bucketProj?.projectedCommittedCents, 2000);
}

function testSimulateActionDebitPurchaseReducesLiquidCash() {
  const state = buildStubState({
    cards: [
      {
        id: 'card-debit',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'Debit Card',
        network: 'VISA',
        productSlug: null,
        rewardRules: [],
        isCredit: false,
        isActive: true,
        isVirtual: false,
      },
    ],
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
    cash: { liquidCents: 10_000, nextPaycheckDateMs: null, nextPaycheckNetCents: null },
  });

  const ctx = buildStubContext({ amountCents: 1500 });
  const projections = simulateAction(state, ctx, { type: 'USE_CARD', cardId: 'card-debit' });
  const bucketProj = projections.buckets.find((b) => b.bucketId === 'bucket-1');
  assert.equal(bucketProj?.projectedPostedSpendCents, 1000);
  assert.equal(bucketProj?.projectedPendingSpendCents, 1500);
  assert.equal(bucketProj?.projectedCommittedCents, 2500);
  assert.equal(projections.cash.projectedLiquidCents, 8500);
}

function testSimulateActionCreditPurchaseUsesLinkedDebtId() {
  const state = buildStubState({
    cards: [
      {
        id: 'card-strong',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'Strong Card',
        network: 'VISA',
        productSlug: null,
        rewardRules: [],
        isCredit: true,
        isActive: true,
        isVirtual: false,
        linkedDebtId: 'debt-2',
      },
    ],
    debts: [
      {
        id: 'debt-1',
        name: 'Debt A',
        type: 'CREDIT_CARD',
        balanceCents: 10_000,
        creditLimitCents: 20_000,
        aprPercent: 20,
        minPaymentCents: 500,
        dueDayOfMonth: 5,
      },
      {
        id: 'debt-2',
        name: 'Debt B',
        type: 'CREDIT_CARD',
        balanceCents: 20_000,
        creditLimitCents: 40_000,
        aprPercent: 18,
        minPaymentCents: 700,
        dueDayOfMonth: 15,
      },
    ],
  });

  const ctx = buildStubContext({ amountCents: 1200 });
  const projections = simulateAction(state, ctx, { type: 'USE_CARD', cardId: 'card-strong' });
  const debtA = projections.debt.find((d) => d.debtId === 'debt-1');
  const debtB = projections.debt.find((d) => d.debtId === 'debt-2');
  assert.equal(debtA?.projectedBalanceCents, 10_000);
  assert.equal(debtB?.projectedBalanceCents, 21_200);
  assert.equal(projections.cash.projectedLiquidCents, 10_000);
}

function testSimulateActionCreditPurchaseWithoutLinkedDebtIdMutatesNoDebt() {
  const state = buildStubState({
    cards: [
      {
        id: 'card-strong',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'Strong Card',
        network: 'VISA',
        productSlug: null,
        rewardRules: [],
        isCredit: true,
        isActive: true,
        isVirtual: false,
      },
    ],
    debts: [
      {
        id: 'debt-1',
        name: 'Strong Card',
        type: 'CREDIT_CARD',
        balanceCents: 10_000,
        creditLimitCents: 20_000,
        aprPercent: 20,
        minPaymentCents: 500,
        dueDayOfMonth: 5,
      },
    ],
  });

  const ctx = buildStubContext({ amountCents: 1200 });
  const projections = simulateAction(state, ctx, { type: 'USE_CARD', cardId: 'card-strong' });
  const debt = projections.debt.find((d) => d.debtId === 'debt-1');
  assert.equal(debt?.projectedBalanceCents, 10_000);
  assert.equal(projections.cash.projectedLiquidCents, 10_000);
}

function testSimulateActionUseCardWithPaydownAppliesPurchaseThenPaydown() {
  const state = buildStubState({
    cards: [
      {
        id: 'card-strong',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'Strong Card',
        network: 'VISA',
        productSlug: null,
        rewardRules: [],
        isCredit: true,
        isActive: true,
        isVirtual: false,
        linkedDebtId: 'debt-1',
      },
    ],
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
    debts: [
      {
        id: 'debt-1',
        name: 'Debt A',
        type: 'CREDIT_CARD',
        balanceCents: 10_000,
        creditLimitCents: 20_000,
        aprPercent: 20,
        minPaymentCents: 500,
        dueDayOfMonth: 5,
      },
    ],
    cash: { liquidCents: 10_000, nextPaycheckDateMs: null, nextPaycheckNetCents: null },
  });

  const ctx = buildStubContext({ amountCents: 1200 });
  const projections = simulateAction(state, ctx, {
    type: 'USE_CARD_WITH_PAYDOWN',
    cardId: 'card-strong',
    debtId: 'debt-1',
    paydownAmountCents: 500,
  });
  const bucketProj = projections.buckets.find((b) => b.bucketId === 'bucket-1');
  const debt = projections.debt.find((d) => d.debtId === 'debt-1');
  assert.equal(bucketProj?.projectedPendingSpendCents, 1200);
  assert.equal(bucketProj?.projectedCommittedCents, 2200);
  assert.equal(debt?.projectedBalanceCents, 10_700);
  assert.equal(projections.cash.projectedLiquidCents, 9500);
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
      nextPaycheckDateMs: new Date('2024-01-15T00:00:00Z').getTime(),
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
  assert.ok(
    actions
      .filter((action) => action.type === 'USE_CARD_WITH_PAYDOWN' || action.type === 'PAY_DOWN_DEBT')
      .every((action) => action.paydownScheduledDateMs == null)
  );
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
    cash: { liquidCents: 2_000, nextPaycheckDateMs: null, nextPaycheckNetCents: null },
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
      nextPaycheckDateMs: new Date('2024-01-15T00:00:00Z').getTime(),
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
    cash: { liquidCents: 20_000, nextPaycheckDateMs: null, nextPaycheckNetCents: null },
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

async function testSolveDecisionMarksDegradedCapabilities() {
  const state = buildStubState({
    buckets: [
      {
        id: 'bucket-essentials',
        name: 'Essentials',
        categoryKey: 'DINING',
        limitCents: 5_000,
        postedSpendCents: 1_000,
        pendingSpendCents: 0,
        committedCents: 1_000,
        remainingCents: 4_000,
        period: 'MONTHLY',
        essentiality: { kind: 'unavailable' },
        strictMode: true,
      },
    ],
    debts: [],
    cash: null,
    capabilities: createUnavailableEngineCapabilities(),
  });
  const ctx = buildStubContext({ amountCents: 2_000 });
  const result = await solveDecision(state, ctx);

  assert.deepEqual(result.capabilities, createUnavailableEngineCapabilities());
  assert.deepEqual(result.degraded, {
    essentialProtection: true,
    debtPressure: true,
    liquidity: true,
    utilization: true,
  });

  const allReasons = result.decisions.flatMap((decision) => decision.reasons);
  for (const reason of allReasons) {
    assert.equal(/safe|protected|within plan|covered reserves/i.test(reason), false);
  }
}

function testGetEngineCapabilitiesDefaultsToUnavailable() {
  const result = getEngineRuntimeMetadata();
  assert.deepEqual(result, {
    capabilities: createUnavailableEngineCapabilities(),
    degraded: {
      essentialProtection: true,
      debtPressure: true,
      liquidity: true,
      utilization: true,
    },
  });
}

async function run() {
  await testSolveDecisionSorts();
  await testDeterministicOrderingForEqualScores();
  await testSolveDecisionValidation();
  await testSafeSolveDecisionSuccess();
  await testSafeSolveDecisionAccountingContract();
  await testSafeSolveDecisionAccountingDeterministic();
  await testSafeSolveDecisionFailure();
  testGenerateCandidatesSkipsDisabled();
  testSimulateActionUpdatesBucket();
  testSimulateActionDebitPurchaseReducesLiquidCash();
  testSimulateActionCreditPurchaseUsesLinkedDebtId();
  testSimulateActionCreditPurchaseWithoutLinkedDebtIdMutatesNoDebt();
  testSimulateActionUseCardWithPaydownAppliesPurchaseThenPaydown();
  testGenerateCandidatesAddsAdvancedActions();
  testPaydownGuardrailBlocksExcess();
  await testCompositeActionImprovesDebtRelief();
  await testSolveDecisionRespondsToProfiles();
  await testSolveDecisionMarksDegradedCapabilities();
  testGetEngineCapabilitiesDefaultsToUnavailable();
  console.warn('engine solver: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
