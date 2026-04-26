import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const { available, createLoadedEngineCapabilities, unavailable } = require('../../lib/engine');
const { evaluateScheduledPaydowns } = require('../../lib/engine/scheduled-paydowns');
const { buildTemporalResponseShape } = require('../../lib/engine/temporal-response');

function mockModule(modulePath, exports) {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

function resetLoaderModules() {
  for (const modulePath of ['../../lib/prisma', '../../lib/adapters/runtime/engine-state.prisma']) {
    try {
      delete require.cache[require.resolve(modulePath)];
    } catch {
      // ignore
    }
  }
}

function basePrisma(overrides = {}) {
  return {
    card: { findMany: async () => [] },
    bucket: { findMany: async () => [] },
    user: { findUnique: async () => null },
    rewardRule: {},
    categoryPreference: {},
    mccToRewardCategory: {},
    dailyState: {},
    recommendationSession: {},
    cherryPointLedger: {},
    decisionEvent: {},
    ...overrides,
  };
}

function buildState(overrides = {}) {
  return {
    userId: 'user-1',
    cards: [],
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
    scheduledPaydowns: unavailable(),
    constraints: { hard: {}, soft: {} },
    world: { baseInterestRate: null, inflationEstimate: null },
    cash: available({ liquidCents: 10_000, nextPaycheckDateMs: null, nextPaycheckNetCents: null }),
    capabilities: createLoadedEngineCapabilities(),
    preferences: { profileId: 'BALANCED' },
    ...overrides,
  };
}

async function loadWithPrisma(prisma) {
  resetLoaderModules();
  mockModule('../../lib/prisma', { prisma });
  const { fromPrismaUserToEngineState } = require('../../lib/adapters/runtime/engine-state.prisma');
  return fromPrismaUserToEngineState('user-1', new Date('2024-01-01T00:00:00Z').getTime());
}

async function run() {
  const missingModelState = await loadWithPrisma(basePrisma());
  assert.equal(missingModelState.scheduledPaydowns.kind, 'unavailable');

  const loadFailureState = await loadWithPrisma(
    basePrisma({
      scheduledPaydown: {
        findMany: async () => {
          throw new Error('scheduled-paydown source unavailable');
        },
      },
    })
  );
  assert.equal(loadFailureState.scheduledPaydowns.kind, 'unavailable');

  const emptyState = await loadWithPrisma(
    basePrisma({
      scheduledPaydown: {
        findMany: async () => [],
      },
    })
  );
  assert.equal(emptyState.scheduledPaydowns.kind, 'available');
  assert.equal(emptyState.scheduledPaydowns.value.length, 0);

  const rawRows = [
    {
      id: 'sp-cancelled',
      debtId: 'debt-1',
      amountCents: 100,
      effectiveAt: new Date('2023-12-31T00:00:00Z'),
      status: 'CANCELLED',
      source: 'USER_SCHEDULED',
    },
    {
      id: 'sp-missing',
      debtId: null,
      amountCents: 200,
      effectiveAt: new Date('2024-01-01T00:00:00Z'),
      status: 'SCHEDULED',
      source: 'AUTOPAY',
    },
    {
      id: 'sp-already',
      debtId: 'debt-1',
      amountCents: 250,
      effectiveAt: new Date('2024-01-01T00:00:00Z'),
      status: 'SCHEDULED',
      source: 'AUTOPAY',
    },
    {
      id: 'sp-future',
      debtId: 'debt-1',
      amountCents: 300,
      effectiveAt: new Date('2024-01-02T00:00:00Z'),
      status: 'SCHEDULED',
      source: 'AUTOPAY',
    },
  ];
  const rawState = await loadWithPrisma(
    basePrisma({
      scheduledPaydown: {
        findMany: async () => rawRows,
      },
    })
  );
  assert.equal(rawState.scheduledPaydowns.kind, 'available');
  assert.equal(rawState.scheduledPaydowns.value.length, 4);
  assert.equal(rawState.scheduledPaydowns.value[0].status, 'CANCELLED');
  assert.equal(rawState.scheduledPaydowns.value[1].debtId, null);
  assert.equal(rawState.scheduledPaydowns.value[2].effectiveAtMs, new Date('2024-01-01T00:00:00Z').getTime());
  assert.equal(rawState.scheduledPaydowns.value[3].effectiveAtMs, new Date('2024-01-02T00:00:00Z').getTime());

  const nowMs = new Date('2024-01-01T00:00:00Z').getTime();

  const unavailableShape = buildTemporalResponseShape(
    evaluateScheduledPaydowns(buildState(), nowMs),
    nowMs
  );
  assert.equal(unavailableShape.temporalContext.scheduledPaydownSourceStatus, 'UNAVAILABLE');

  const noActiveState = buildState({
    scheduledPaydowns: available([
      {
        id: 'sp-1',
        debtId: 'missing-debt',
        amountCents: 1_000,
        effectiveAtMs: nowMs + 60_000,
        status: 'SCHEDULED',
        source: 'AUTOPAY',
      },
    ]),
  });
  const noActiveEvaluation = evaluateScheduledPaydowns(noActiveState, nowMs);
  const noActiveShape = buildTemporalResponseShape(noActiveEvaluation, nowMs);
  assert.equal(noActiveShape.temporalContext.scheduledPaydownSourceStatus, 'AVAILABLE_NO_ACTIVE');
  assert.deepEqual(noActiveEvaluation.diagnostics, [
    { code: 'SCHEDULED_PAYDOWN_MISSING_DEBT_ID', count: 1 },
  ]);

  const classifiedLaterEvaluation = evaluateScheduledPaydowns(
    buildState({ scheduledPaydowns: rawState.scheduledPaydowns }),
    nowMs
  );
  assert.equal(classifiedLaterEvaluation.sourceStatus, 'AVAILABLE_ACTIVE');
  assert.equal(classifiedLaterEvaluation.presentEffective.length, 1);
  assert.equal(classifiedLaterEvaluation.futureEligible.length, 1);
  assert.deepEqual(classifiedLaterEvaluation.diagnostics, [
    { code: 'SCHEDULED_PAYDOWN_MISSING_DEBT_ID', count: 1 },
  ]);

  const activeShape = buildTemporalResponseShape(classifiedLaterEvaluation, nowMs);
  assert.equal(activeShape.temporalContext.scheduledPaydownSourceStatus, 'AVAILABLE_ACTIVE');
  assert.equal(activeShape.temporalContext.includesScheduledPaydowns, true);

  console.warn('node runtime-scheduled-paydowns-availability: ok');
}

void run();
