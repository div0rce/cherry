import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const { createLoadedEngineCapabilities, deriveDegradedDimensions } = require('../../lib/engine');

function mockModule(modulePath, exports) {
  try {
    const resolved = require.resolve(modulePath);
    require.cache[resolved] = {
      id: resolved,
      filename: resolved,
      loaded: true,
      exports,
    };
  } catch {
    // ignore
  }
}

function resetModules() {
  for (const modulePath of [
    '../../app/api/simulate/route',
    '../../lib/prisma',
    '../../lib/engine-state',
    '../../lib/engine-state.js',
    '../../lib/engine',
    '../../lib/engine.js',
    '../../lib/engine/run',
    '../../lib/engine/run.js',
    '../../lib/adapters/runtime/world.prisma',
    '../../lib/adapters/runtime/authority.prisma',
    '../../lib/user-context',
    '../../lib/auth',
    'next/server',
  ]) {
    try {
      delete require.cache[require.resolve(modulePath)];
    } catch {
      // ignore
    }
  }
}

function mockNextServer() {
  class MockResponse extends Response {
    static json(body, init = {}) {
      return new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        headers: { 'content-type': 'application/json' },
      });
    }
  }
  mockModule('next/server', {
    NextResponse: MockResponse,
    NextRequest: class extends Request {},
  });
}

function emptyCashProjection() {
  return {
    ['projected' + 'LiquidCents']: null,
    projectedOverdraftRisk: null,
  };
}

const DIAGNOSTIC_CODE = 'SCHEDULED_PAYDOWN_MISSING_DEBT_ID';

function assertNoPublicDiagnosticLeak(payload) {
  assert.equal(JSON.stringify(payload).includes(DIAGNOSTIC_CODE), false);
  for (const key of [
    'temporalContext',
    'contingentRecommendation',
    'futureRiskContext',
    'degradation',
    'decision',
    'authority',
    'transaction',
    'error',
  ]) {
    if (payload[key] !== undefined) {
      assert.equal(JSON.stringify(payload[key]).includes(DIAGNOSTIC_CODE), false);
    }
  }
}

async function run() {
  resetModules();
  mockNextServer();

  const RealDate = Date;
  const fixedNowMs = new RealDate('2024-01-01T00:00:00Z').getTime();
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) return new RealDate(fixedNowMs);
      return new RealDate(...args);
    }
    static now() {
      return fixedNowMs;
    }
    static parse(value) {
      return RealDate.parse(value);
    }
    static UTC(...args) {
      return RealDate.UTC(...args);
    }
  };

  const capabilities = createLoadedEngineCapabilities();
  const degraded = deriveDegradedDimensions(capabilities);
  function buildState(scheduledPaydowns) {
    return {
    userId: 'user-1',
    cards: [],
    buckets: [],
    debts: { kind: 'available', value: [{ id: 'debt-1', name: 'Debt', type: 'CREDIT_CARD', balanceCents: 5_000, creditLimitCents: 10_000, aprPercent: 18, minPaymentCents: 100, dueDayOfMonth: 1 }] },
    scheduledPaydowns,
    constraints: { hard: {}, soft: {} },
    world: { baseInterestRate: null, inflationEstimate: null },
    cash: { kind: 'available', value: { liquidCents: 10_000, nextPaycheckDateMs: null, nextPaycheckNetCents: null } },
    capabilities,
    preferences: { profileId: 'BALANCED' },
    };
  }

  let currentState = buildState({ kind: 'available', value: [] });
  let engineOutcome = 'ok';
  const capturedEvaluations = [];

  mockModule('../../lib/prisma', {
    prisma: {
      simulation: { create: async () => ({ id: 'sim-1' }) },
      $transaction: async (fn) => fn({ simulatedTransaction: { create: async () => ({ id: 'tx-1' }) } }),
    },
  });
  mockModule('../../lib/engine-state', {
    fromPrismaUserToEngineState: async () => currentState,
  });
  mockModule('../../lib/engine-state.js', {
    fromPrismaUserToEngineState: async () => currentState,
  });
  mockModule('../../lib/engine', {
    buildEngineContext: (input) => input,
    pickTopLegacySurfaceDecision: (decisions) => decisions[0],
    mapSolverDecisionToLegacyDecision: () => ({
      category: 'DINING',
      amountCents: 1200,
      budget: {
        name: null,
        bucketId: null,
        limitCents: null,
        spentBeforeCents: null,
        spentAfterCents: null,
        remainingAfterCents: null,
        strictMode: false,
        wouldExceed: false,
        coverageMode: 'UNCONFIGURED',
        verdict: 'UNCONFIGURED',
      },
      card: {
        cardId: null,
        cardNickname: null,
        rewardUnit: null,
        rewardRate: null,
        rewardPoints: null,
        rewardValueCents: null,
        verdict: 'NO_CARD_DATA',
      },
      overallVerdict: 'UNKNOWN',
      cherryIncentive: { pointsIfFollowed: 0, expiryMinutes: 0 },
    }),
  });
  mockModule('../../lib/engine/run', {
    safeSolveDecisionForWorld: async (_world, _userId, _ctx, options) => {
      capturedEvaluations.push(options.scheduledPaydownEvaluation);
      if (engineOutcome === 'fallback') {
        return {
          ok: false,
          reason: 'ENGINE_ERROR',
          message: 'engine unavailable',
          capabilities,
          degraded,
        };
      }
      return {
        ok: true,
        decisions:
          engineOutcome === 'noDecision'
            ? []
            : [
                {
                  actionId: 'reject_purchase',
                  action: { type: 'REJECT_PURCHASE' },
                  score: 1,
                  reasons: [],
                  projections: { buckets: [], debt: [], cash: emptyCashProjection() },
                  constraintsBreached: [],
                },
              ],
        trace: { candidates: [] },
        exclusions: { creditActionsGeneratedCount: 0, creditUnresolvableLiabilityCount: 0 },
        capabilities,
        degraded,
        state: currentState,
      };
    },
  });
  mockModule('../../lib/engine/run.js', {
    safeSolveDecisionForWorld: async (_world, _userId, _ctx, options) => {
      capturedEvaluations.push(options.scheduledPaydownEvaluation);
      if (engineOutcome === 'fallback') {
        return {
          ok: false,
          reason: 'ENGINE_ERROR',
          message: 'engine unavailable',
          capabilities,
          degraded,
        };
      }
      return {
        ok: true,
        decisions:
          engineOutcome === 'noDecision'
            ? []
            : [
                {
                  actionId: 'reject_purchase',
                  action: { type: 'REJECT_PURCHASE' },
                  score: 1,
                  reasons: [],
                  projections: { buckets: [], debt: [], cash: emptyCashProjection() },
                  constraintsBreached: [],
                },
              ],
        trace: { candidates: [] },
        exclusions: { creditActionsGeneratedCount: 0, creditUnresolvableLiabilityCount: 0 },
        capabilities,
        degraded,
        state: currentState,
      };
    },
  });
  mockModule('../../lib/adapters/runtime/world.prisma', {
    buildPrismaWorld: () => ({ logger: console }),
  });
  mockModule('../../lib/adapters/runtime/authority.prisma', {
    simulateSpendAuthority: async () => ({ ok: true, decision: null }),
    recordDecisionEvent: async () => {},
  });
  mockModule('../../lib/user-context', {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'DEV' }),
    assertUserId: () => {},
    logInvariant: () => {},
    isPrismaP2003: () => false,
  });
  mockModule('../../lib/auth', {
    auth: async () => null,
  });
  mockModule('../../lib/legacy-engine', {
    runEngine: async () => null,
  });
  mockModule('../../lib/engine-invariants', {
    validateEngineDecision: () => {},
  });

  const { POST } = require('../../app/api/simulate/route');

  async function postWith(scheduledPaydowns, outcome = 'ok') {
    currentState = buildState(scheduledPaydowns);
    engineOutcome = outcome;
    const response = await POST({
      json: async () => ({
        merchantName: 'Cafe',
        amountCents: 1200,
        category: 'DINING',
      }),
    });
    const payload = await response.json();
    assertNoPublicDiagnosticLeak(payload);
    return payload;
  }

  const unavailable = await postWith({ kind: 'unavailable' });
  assert.equal(unavailable.temporalContext.scheduledPaydownSourceStatus, 'UNAVAILABLE');
  assert.equal(unavailable.temporalContext.modelMode, 'PRESENT_ONLY');
  assert.equal(unavailable.contingentRecommendation, null);

  const empty = await postWith({ kind: 'available', value: [] });
  assert.equal(empty.temporalContext.scheduledPaydownSourceStatus, 'AVAILABLE_EMPTY');
  assert.equal(empty.temporalContext.modelMode, 'PRESENT_ONLY');
  assert.equal(empty.temporalContext.includesScheduledPaydowns, false);

  const noActive = await postWith({
    kind: 'available',
    value: [
      {
        id: 'sp-cancelled',
        debtId: 'debt-1',
        amountCents: 1_500,
        effectiveAtMs: fixedNowMs + 60_000,
        status: 'CANCELLED',
        source: 'AUTOPAY',
      },
    ],
  });
  assert.equal(noActive.temporalContext.scheduledPaydownSourceStatus, 'AVAILABLE_NO_ACTIVE');
  assert.equal(noActive.contingentRecommendation, null);

  const missingDebt = await postWith({
    kind: 'available',
    value: [
      {
        id: 'sp-missing',
        debtId: null,
        amountCents: 1_500,
        effectiveAtMs: fixedNowMs + 60_000,
        status: 'SCHEDULED',
        source: 'AUTOPAY',
      },
    ],
  });
  assert.equal(missingDebt.temporalContext.scheduledPaydownSourceStatus, 'AVAILABLE_NO_ACTIVE');
  assert.equal(JSON.stringify(missingDebt).includes('SCHEDULED_PAYDOWN_MISSING_DEBT_ID'), false);

  const active = await postWith({
    kind: 'available',
    value: [
      {
        id: 'sp-future',
        debtId: 'debt-1',
        amountCents: 1_500,
        effectiveAtMs: fixedNowMs + 60_000,
        status: 'SCHEDULED',
        source: 'AUTOPAY',
      },
    ],
  });
  assert.equal(active.temporalContext.scheduledPaydownSourceStatus, 'AVAILABLE_ACTIVE');
  assert.equal(active.temporalContext.modelMode, 'PRESENT_PLUS_FUTURE_EVENTS');
  assert.equal(active.temporalContext.includesScheduledPaydowns, true);
  assert.ok(active.contingentRecommendation);
  assert.equal(JSON.stringify(active.decision).includes('SCHEDULED_PAYDOWN'), false);

  for (const effectiveAtMs of [fixedNowMs - 1, fixedNowMs]) {
    const alreadyEffective = await postWith({
      kind: 'available',
      value: [
        {
          id: 'sp-present',
          debtId: 'debt-1',
          amountCents: 1_500,
          effectiveAtMs,
          status: 'SCHEDULED',
          source: 'AUTOPAY',
        },
      ],
    });
    const latestEvaluation = capturedEvaluations.at(-1);
    assert.equal(latestEvaluation.presentEffective.length, 1);
    assert.equal(latestEvaluation.futureEligible.length, 0);
    assert.equal(alreadyEffective.temporalContext.scheduledPaydownSourceStatus, 'AVAILABLE_NO_ACTIVE');
    assert.equal(alreadyEffective.temporalContext.includesScheduledPaydowns, false);
    assert.equal(alreadyEffective.temporalContext.modelMode, 'PRESENT_ONLY');
    assert.equal(alreadyEffective.temporalContext.contingency, 'NONE');
    assert.equal(alreadyEffective.contingentRecommendation, null);
    assert.equal(alreadyEffective.futureRiskContext, null);
  }

  const fallback = await postWith({ kind: 'available', value: [] }, 'fallback');
  assert.ok(fallback.temporalContext);
  assert.equal(fallback.decision, null);
  assert.equal(fallback.contingentRecommendation, null);
  assert.equal(fallback.futureRiskContext, null);

  const noDecision = await postWith({ kind: 'available', value: [] }, 'noDecision');
  assert.ok(noDecision.temporalContext);
  assert.equal(noDecision.decision, null);
  assert.equal(noDecision.contingentRecommendation, null);
  assert.equal(noDecision.futureRiskContext, null);

  globalThis.Date = RealDate;

  console.warn('next api-simulate.temporal-context: ok');
}

void run();
