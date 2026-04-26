import * as assert from 'node:assert/strict';
import {
  available,
  buildEngineContext,
  createLoadedEngineCapabilities,
  evaluateConstraintsForDecision,
  solveDecision,
  simulateAction,
  type EngineState,
} from '../../lib/engine.js';
import { deriveEngineDegradation } from '../../lib/engine/degradation.js';

const nowMs = new Date('2024-01-01T00:00:00Z').getTime();

function buildState(
  withFutureScheduledPaydown: boolean,
  overrides: Partial<EngineState> = {}
): EngineState {
  return {
    userId: 'user-1',
    cards: [
      {
        id: 'card-1',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'Card',
        network: 'VISA',
        productSlug: null,
        rewardRules: [
          {
            id: 'rule-1',
            cardId: 'card-1',
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
    scheduledPaydowns: withFutureScheduledPaydown
      ? available([
          {
            id: 'sp-1',
            debtId: 'debt-1',
            amountCents: 1_500,
            effectiveAtMs: nowMs + 60_000,
            status: 'SCHEDULED',
            source: 'AUTOPAY',
          },
        ])
      : available([]),
    constraints: { hard: {}, soft: {} },
    world: { baseInterestRate: null, inflationEstimate: null },
    cash: available({ liquidCents: 10_000, nextPaycheckDateMs: null, nextPaycheckNetCents: null }),
    capabilities: createLoadedEngineCapabilities(),
    preferences: { profileId: 'BALANCED' },
    ...overrides,
  };
}

async function run(): Promise<void> {
  const ctx = buildEngineContext({
    surface: 'web',
    nowMs,
    merchantCategoryKey: 'DINING',
    amountCents: 1_000,
  });

  const withoutFuture = await solveDecision(buildState(false), ctx);
  const withFuture = await solveDecision(buildState(true), ctx);

  assert.equal(withoutFuture.decisions[0]?.actionId, withFuture.decisions[0]?.actionId);
  assert.equal(withoutFuture.decisions[0]?.score, withFuture.decisions[0]?.score);
  assert.deepEqual(withoutFuture.exclusions, withFuture.exclusions);
  assert.deepEqual(
    withFuture.decisions.map((decision) => [decision.actionId, decision.score]),
    withoutFuture.decisions.map((decision) => [decision.actionId, decision.score])
  );
  assert.deepEqual(
    deriveEngineDegradation(withFuture.exclusions),
    deriveEngineDegradation(withoutFuture.exclusions)
  );
  assert.ok(
    withFuture.decisions.every(
      (decision) =>
        decision.action.paydownScheduledDateMs == null ||
        decision.action.paydownScheduledDateMs <= nowMs
    )
  );

  const utilizationCtx = buildEngineContext({
    surface: 'web',
    nowMs,
    merchantCategoryKey: 'DINING',
    amountCents: 1_000,
  });
  const invalidWithoutFuture = await solveDecision(
    buildState(false, {
      constraints: { hard: { maxCardUtilization: 0.95 }, soft: {} },
      debts: available([
        {
          id: 'debt-1',
          name: 'Debt',
          type: 'CREDIT_CARD',
          balanceCents: 9_000,
          creditLimitCents: 10_000,
          aprPercent: 18,
          minPaymentCents: 100,
          dueDayOfMonth: 1,
        },
      ]),
    }),
    utilizationCtx
  );
  const invalidWithFuture = await solveDecision(
    buildState(true, {
      constraints: { hard: { maxCardUtilization: 0.95 }, soft: {} },
      debts: available([
        {
          id: 'debt-1',
          name: 'Debt',
          type: 'CREDIT_CARD',
          balanceCents: 9_000,
          creditLimitCents: 10_000,
          aprPercent: 18,
          minPaymentCents: 100,
          dueDayOfMonth: 1,
        },
      ]),
      scheduledPaydowns: available([
        {
          id: 'sp-future-rescue',
          debtId: 'debt-1',
          amountCents: 5_000,
          effectiveAtMs: nowMs + 60_000,
          status: 'SCHEDULED',
          source: 'AUTOPAY',
        },
      ]),
    }),
    utilizationCtx
  );
  assert.equal(
    invalidWithoutFuture.decisions.some((decision) => decision.actionId === 'use_card:card-1'),
    false
  );
  assert.equal(
    invalidWithFuture.decisions.some((decision) => decision.actionId === 'use_card:card-1'),
    false
  );

  const futureCandidate = {
    type: 'PAY_DOWN_DEBT' as const,
    debtId: 'debt-1',
    paydownAmountCents: 1_000,
    paydownScheduledDateMs: nowMs + 60_000,
  };
  const futureCardPaydownCandidate = {
    type: 'USE_CARD_WITH_PAYDOWN' as const,
    cardId: 'card-1',
    debtId: 'debt-1',
    paydownAmountCents: 1_000,
    paydownScheduledDateMs: nowMs + 60_000,
  };
  const futureCandidateProjection = simulateAction(buildState(false), ctx, futureCandidate);
  assert.ok(
    evaluateConstraintsForDecision(
      buildState(false),
      ctx,
      futureCandidate,
      futureCandidateProjection
    ).includes('HARD:FUTURE_PAYDOWN_NOT_PRESENT_EFFECTIVE')
  );
  const futureCardPaydownProjection = simulateAction(
    buildState(false),
    ctx,
    futureCardPaydownCandidate
  );
  assert.ok(
    evaluateConstraintsForDecision(
      buildState(false),
      ctx,
      futureCardPaydownCandidate,
      futureCardPaydownProjection
    ).includes('HARD:FUTURE_PAYDOWN_NOT_PRESENT_EFFECTIVE')
  );
  const presentRankingCandidates = [
    { type: 'USE_CARD' as const, cardId: 'card-1' },
    { type: 'REJECT_PURCHASE' as const },
  ];
  const presentRanking = await solveDecision(buildState(false), ctx, {
    candidateActionsOverride: presentRankingCandidates,
  });
  const futureCandidateRanking = await solveDecision(buildState(false), ctx, {
    candidateActionsOverride: [
      futureCandidate,
      futureCardPaydownCandidate,
      ...presentRankingCandidates,
    ],
  });
  assert.equal(futureCandidateRanking.decisions[0]?.action.type, 'USE_CARD');
  assert.equal(
    futureCandidateRanking.decisions.some(
      (decision) =>
        decision.action.type === 'PAY_DOWN_DEBT' ||
        decision.action.type === 'USE_CARD_WITH_PAYDOWN'
    ),
    false
  );
  assert.deepEqual(
    futureCandidateRanking.decisions.map((decision) => [decision.actionId, decision.score]),
    presentRanking.decisions.map((decision) => [decision.actionId, decision.score])
  );

  const missingDebtResult = await solveDecision(
    buildState(false, {
      scheduledPaydowns: available([
        {
          id: 'sp-missing',
          debtId: 'missing-debt',
          amountCents: 1_000,
          effectiveAtMs: nowMs + 60_000,
          status: 'SCHEDULED',
          source: 'AUTOPAY',
        },
      ]),
    }),
    ctx
  );
  assert.deepEqual(missingDebtResult.trace.diagnostics, [
    { code: 'SCHEDULED_PAYDOWN_MISSING_DEBT_ID', count: 1 },
  ]);
  assert.equal(
    JSON.stringify(missingDebtResult.exclusions).includes('SCHEDULED_PAYDOWN_MISSING_DEBT_ID'),
    false
  );
  assert.equal(
    JSON.stringify(deriveEngineDegradation(missingDebtResult.exclusions)).includes(
      'SCHEDULED_PAYDOWN_MISSING_DEBT_ID'
    ),
    false
  );
  assert.equal(
    missingDebtResult.decisions.some((decision) =>
      decision.constraintsBreached.includes('SCHEDULED_PAYDOWN_MISSING_DEBT_ID')
    ),
    false
  );

  console.warn('node engine-solver-scheduled-paydowns: ok');
}

void run();
