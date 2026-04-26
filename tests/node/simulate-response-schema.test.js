import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const { SimulateResponseSchema } = require('../../lib/schemas/simulate');

function makeBase() {
  return {
    simulationId: 'sim-1',
    capabilities: {
      essentiality: { available: true, reason: 'loaded' },
      debt: { available: false, reason: 'not_loaded' },
      liquidCash: { available: true, reason: 'loaded' },
      utilization: { available: false, reason: 'not_loaded' },
    },
    degraded: {
      essentialProtection: false,
      debtPressure: true,
      liquidity: false,
      utilization: true,
    },
    degradation: {
      code: 'CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY',
      message: 'Credit recommendations were excluded because the credit liability could not be fully resolved.',
    },
    authority: null,
    committed: false,
    temporalContext: {
      modelMode: 'PRESENT_ONLY',
      decisionTimeMs: 1_700_000_000_000,
      horizonEndMs: null,
      includesScheduledPaydowns: false,
      contingency: 'NONE',
      scheduledPaydownSourceStatus: 'UNAVAILABLE',
    },
    contingentRecommendation: null,
    futureRiskContext: null,
  };
}

function run() {
  const validCardSuccess = SimulateResponseSchema.safeParse({
    ...makeBase(),
    transaction: {
      id: 'tx-1',
      chosenCardId: 'card-1',
    },
    decision: {
      card: {
        cardId: 'card-1',
      },
    },
  });
  assert.equal(validCardSuccess.success, true);

  const committedNullDecision = SimulateResponseSchema.safeParse({
    ...makeBase(),
    committed: true,
    transaction: { id: 'tx-1', chosenCardId: 'card-1' },
    decision: null,
    error: { code: 'BROKEN', message: 'broken' },
  });
  assert.equal(committedNullDecision.success, false);

  const cardSuccessMissingCardId = SimulateResponseSchema.safeParse({
    ...makeBase(),
    transaction: { id: 'tx-1', chosenCardId: 'card-1' },
    decision: { card: { cardId: null } },
  });
  assert.equal(cardSuccessMissingCardId.success, false);

  const noDecisionWithSuccessFields = SimulateResponseSchema.safeParse({
    ...makeBase(),
    decision: null,
    transaction: { id: 'tx-1', chosenCardId: 'card-1' },
    error: { code: 'BROKEN', message: 'broken' },
  });
  assert.equal(noDecisionWithSuccessFields.success, false);

  const validNoDecisionFallback = SimulateResponseSchema.safeParse({
    ...makeBase(),
    decision: null,
    transaction: null,
    committed: false,
    error: {
      code: 'CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY',
      message: 'Credit recommendations were excluded because the credit liability could not be fully resolved.',
    },
  });
  assert.equal(validNoDecisionFallback.success, true);

  console.warn('node simulate-response-schema: ok');
}

run();
