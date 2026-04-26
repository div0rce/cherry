import * as assert from 'node:assert/strict';
import {
  available,
  buildEngineContext,
  createLoadedEngineCapabilities,
  evaluateScheduledPaydowns,
  simulateAction,
  type EngineAction,
  type EngineState,
} from '../../lib/engine.js';

function buildState(overrides: Partial<EngineState> = {}): EngineState {
  return {
    userId: 'user-1',
    cards: [
      {
        id: 'card-credit',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'Credit',
        network: 'VISA',
        productSlug: null,
        rewardRules: [],
        isCredit: true,
        isActive: true,
        isVirtual: false,
        linkedDebtId: 'debt-1',
      },
    ],
    buckets: [],
    debts: available([
      {
        id: 'debt-1',
        name: 'Debt',
        type: 'CREDIT_CARD',
        balanceCents: 5_000,
        creditLimitCents: 10_000,
        aprPercent: 18,
        minPaymentCents: 100,
        dueDayOfMonth: 1,
      },
    ]),
    scheduledPaydowns: available([]),
    constraints: { hard: {}, soft: {} },
    world: { baseInterestRate: null, inflationEstimate: null },
    cash: available({ liquidCents: 10_000, nextPaycheckDateMs: null, nextPaycheckNetCents: null }),
    capabilities: createLoadedEngineCapabilities(),
    preferences: { profileId: 'BALANCED' },
    ...overrides,
  };
}

const nowMs = new Date('2024-01-01T00:00:00Z').getTime();

function buildContext() {
  return buildEngineContext({
    surface: 'web',
    nowMs,
    merchantCategoryKey: 'DINING',
    amountCents: 1_000,
  });
}

function projectedDebtBalance(result: ReturnType<typeof simulateAction>): number {
  return result.debt.find((debt) => debt.debtId === 'debt-1')?.projectedBalanceCents ?? -1;
}

function projectedDebtBalanceById(
  result: ReturnType<typeof simulateAction>,
  debtId: string
): number {
  return result.debt.find((debt) => debt.debtId === debtId)?.projectedBalanceCents ?? -1;
}

function projectedLiquid(result: ReturnType<typeof simulateAction>): number | null {
  const key = ('projected' + 'LiquidCents') as keyof typeof result.cash;
  return result.cash[key];
}

function run(): void {
  const ctx = buildContext();
  const noopAction: EngineAction = { type: 'REJECT_PURCHASE' };
  const baseline = simulateAction(buildState(), ctx, noopAction);

  const futureOnly = simulateAction(
    buildState({
      scheduledPaydowns: available([
        {
          id: 'sp-1',
          debtId: 'debt-1',
          amountCents: 1_500,
          effectiveAtMs: nowMs + 60_000,
          status: 'SCHEDULED',
          source: 'AUTOPAY',
        },
      ]),
    }),
    ctx,
    noopAction
  );
  assert.equal(projectedDebtBalance(futureOnly), 5_000);
  assert.deepEqual(futureOnly.cash, baseline.cash);

  const pastEffective = simulateAction(
    buildState({
      scheduledPaydowns: available([
        {
          id: 'sp-past',
          debtId: 'debt-1',
          amountCents: 1_500,
          effectiveAtMs: nowMs - 60_000,
          status: 'SCHEDULED',
          source: 'AUTOPAY',
        },
      ]),
    }),
    ctx,
    noopAction
  );
  assert.equal(projectedDebtBalance(pastEffective), 3_500);
  assert.equal(projectedLiquid(pastEffective), 8_500);

  const alreadyEffective = simulateAction(
    buildState({
      scheduledPaydowns: available([
        {
          id: 'sp-1',
          debtId: 'debt-1',
          amountCents: 1_500,
          effectiveAtMs: nowMs,
          status: 'SCHEDULED',
          source: 'AUTOPAY',
        },
      ]),
    }),
    ctx,
    noopAction
  );
  assert.equal(projectedDebtBalance(alreadyEffective), 3_500);
  assert.equal(projectedLiquid(alreadyEffective), 8_500);

  const duplicateGuard = simulateAction(
    buildState({
      scheduledPaydowns: available([
        {
          id: 'sp-once',
          debtId: 'debt-1',
          amountCents: 1_500,
          effectiveAtMs: nowMs,
          status: 'SCHEDULED',
          source: 'USER_SCHEDULED',
        },
      ]),
    }),
    ctx,
    noopAction
  );
  assert.equal(projectedDebtBalance(duplicateGuard), 3_500);
  assert.equal(projectedLiquid(duplicateGuard), 8_500);

  const scheduledCandidatePaydown = simulateAction(
    buildState(),
    ctx,
    {
      type: 'PAY_DOWN_DEBT',
      debtId: 'debt-1',
      paydownAmountCents: 1_000,
      paydownScheduledDateMs: nowMs + 60_000,
    }
  );
  assert.equal(projectedDebtBalance(scheduledCandidatePaydown), 5_000);
  assert.equal(projectedLiquid(scheduledCandidatePaydown), 10_000);

  const boundaryCandidatePaydown = simulateAction(
    buildState(),
    ctx,
    {
      type: 'PAY_DOWN_DEBT',
      debtId: 'debt-1',
      paydownAmountCents: 1_000,
      paydownScheduledDateMs: nowMs,
    }
  );
  assert.equal(projectedDebtBalance(boundaryCandidatePaydown), 4_000);
  assert.equal(projectedLiquid(boundaryCandidatePaydown), 9_000);

  const sameTimestampOrdering = simulateAction(
    buildState({
      scheduledPaydowns: available([
        {
          id: 'sp-order',
          debtId: 'debt-1',
          amountCents: 1_200,
          effectiveAtMs: nowMs,
          status: 'SCHEDULED',
          source: 'AUTOPAY',
        },
      ]),
      debts: available([
        {
          id: 'debt-1',
          name: 'Debt',
          type: 'CREDIT_CARD',
          balanceCents: 1_000,
          creditLimitCents: 10_000,
          aprPercent: 18,
          minPaymentCents: 100,
          dueDayOfMonth: 1,
        },
      ]),
    }),
    ctx,
    { type: 'USE_CARD', cardId: 'card-credit' }
  );
  assert.equal(projectedDebtBalance(sameTimestampOrdering), 1_000);

  const purchaseBeforePaydown = simulateAction(
    buildState({
      debts: available([
        {
          id: 'debt-1',
          name: 'Debt',
          type: 'CREDIT_CARD',
          balanceCents: 500,
          creditLimitCents: 10_000,
          aprPercent: 18,
          minPaymentCents: 100,
          dueDayOfMonth: 1,
        },
      ]),
    }),
    ctx,
    {
      type: 'USE_CARD_WITH_PAYDOWN',
      cardId: 'card-credit',
      debtId: 'debt-1',
      paydownAmountCents: 1_000,
      paydownScheduledDateMs: nowMs,
    }
  );
  assert.equal(projectedDebtBalance(purchaseBeforePaydown), 500);
  assert.equal(projectedLiquid(purchaseBeforePaydown), 9_000);

  const missingDebtState = buildState({
    scheduledPaydowns: available([
      {
        id: 'sp-missing',
        debtId: 'missing-debt',
        amountCents: 1_500,
        effectiveAtMs: nowMs,
        status: 'SCHEDULED',
        source: 'AUTOPAY',
      },
    ]),
  });
  const missingDebtEvaluation = evaluateScheduledPaydowns(missingDebtState, nowMs);
  const missingDebtSimulation = simulateAction(missingDebtState, ctx, noopAction, {
    scheduledPaydownEvaluation: missingDebtEvaluation,
  });
  assert.deepEqual(missingDebtEvaluation.diagnostics, [
    { code: 'SCHEDULED_PAYDOWN_MISSING_DEBT_ID', count: 1 },
  ]);
  assert.equal(projectedDebtBalance(missingDebtSimulation), 5_000);
  assert.equal(projectedLiquid(missingDebtSimulation), 10_000);

  const cancelled = simulateAction(
    buildState({
      scheduledPaydowns: available([
        {
          id: 'sp-cancelled',
          debtId: 'debt-1',
          amountCents: 1_500,
          effectiveAtMs: nowMs,
          status: 'CANCELLED',
          source: 'AUTOPAY',
        },
      ]),
    }),
    ctx,
    noopAction
  );
  assert.equal(projectedDebtBalance(cancelled), 5_000);
  assert.equal(projectedLiquid(cancelled), 10_000);

  const debitPurchase = simulateAction(
    buildState({
      cards: [
        {
          id: 'card-debit',
          userId: 'user-1',
          issuer: 'Bank',
          label: 'Debit',
          network: 'VISA',
          productSlug: null,
          rewardRules: [],
          isCredit: false,
          isActive: true,
          isVirtual: false,
          linkedDebtId: null,
        },
      ],
    }),
    ctx,
    { type: 'USE_CARD', cardId: 'card-debit' }
  );
  assert.equal(projectedLiquid(debitPurchase), 9_000);
  assert.equal(projectedDebtBalance(debitPurchase), 5_000);

  const creditPurchase = simulateAction(
    buildState(),
    ctx,
    { type: 'USE_CARD', cardId: 'card-credit' }
  );
  assert.equal(projectedLiquid(creditPurchase), 10_000);
  assert.equal(projectedDebtBalance(creditPurchase), 6_000);

  const noLabelFallback = simulateAction(
    buildState({
      cards: [
        {
          id: 'card-credit',
          userId: 'user-1',
          issuer: 'Issuer',
          label: 'Debt',
          network: 'VISA',
          productSlug: null,
          rewardRules: [],
          isCredit: true,
          isActive: true,
          isVirtual: false,
          linkedDebtId: null,
        },
      ],
      debts: available([
        {
          id: 'debt-named-like-card',
          name: 'Debt',
          type: 'CREDIT_CARD',
          balanceCents: 5_000,
          creditLimitCents: 10_000,
          aprPercent: 18,
          minPaymentCents: 100,
          dueDayOfMonth: 1,
        },
      ]),
    }),
    ctx,
    { type: 'USE_CARD', cardId: 'card-credit' }
  );
  assert.equal(projectedDebtBalanceById(noLabelFallback, 'debt-named-like-card'), 5_000);

  console.warn('node engine-scheduled-paydowns-temporal: ok');
}

run();
