import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assert = require('node:assert/strict');

process.env.NODE_OPTIONS = '--experimental-specifier-resolution=node';
process.env.NODE_PATH = [__dirname + '/__mocks__', process.env.NODE_PATH || ''].filter(Boolean).join(':');
require('module').Module._initPaths();
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'commonjs',
  moduleResolution: 'node',
  baseUrl: '.',
  paths: { '@/*': ['./*'] },
});
const Module = require('module');
const { CreateSessionResponseSchema } = require('../../lib/schemas/sessions');
const {
  CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_CODE,
} = require('../../lib/engine/degradation');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const mapped = path.join(__dirname, '..', '..', request.slice(2));
    return originalResolve.call(this, mapped, parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

function mockModule(modulePath, exports) {
  require.cache[require.resolve(modulePath)] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
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
  const exports = {
    NextResponse: MockResponse,
    NextRequest: class extends Request {},
  };
  const resolved = require.resolve('next/server');
  mockModule(resolved, exports);
  mockModule(resolved.replace(/\.js$/, ''), exports);
  try {
    const alt = require.resolve('next/server');
    mockModule(alt, exports);
  } catch {
    // ignore
  }
}

function available(value) {
  return { kind: 'available', value };
}

const loadedCapabilities = {
  essentiality: { available: true, reason: 'loaded' },
  debt: { available: true, reason: 'loaded' },
  liquidCash: { available: true, reason: 'loaded' },
  utilization: { available: true, reason: 'loaded' },
};

const unavailableCapabilities = {
  essentiality: { available: false, reason: 'not_modeled' },
  debt: { available: false, reason: 'not_modeled' },
  liquidCash: { available: false, reason: 'not_modeled' },
  utilization: { available: false, reason: 'not_modeled' },
};

const loadedMetadata = {
  capabilities: loadedCapabilities,
  degraded: {
    essentialProtection: false,
    debtPressure: false,
    liquidity: false,
    utilization: false,
  },
};

const unavailableMetadata = {
  capabilities: unavailableCapabilities,
  degraded: {
    essentialProtection: true,
    debtPressure: true,
    liquidity: true,
    utilization: true,
  },
};

function setupSessionMocks({
  engineOk = true,
  nonCardTop = false,
  noDecision = false,
  exclusions = {
    creditActionsGeneratedCount: 1,
    creditUnresolvableLiabilityCount: 0,
  },
} = {}) {
  const engineState = {
    userId: 'lab-user-1',
    cards: [
      {
        id: 'card-1',
        userId: 'lab-user-1',
        issuer: 'Test',
        label: 'Demo Card',
        rewardRules: [],
        isCredit: true,
        isActive: true,
        isVirtual: false,
        productSlug: null,
        last4: null,
        creditLimitCents: null,
        currentBalanceCents: null,
        network: 'VISA',
      },
    ],
    buckets: [
      {
        id: 'bucket-1',
        name: 'Dining',
        categoryKey: 'DINING',
        limitCents: 10000,
        postedSpendCents: 1000,
        pendingSpendCents: 0,
        committedCents: 1000,
        remainingCents: 9000,
        period: 'MONTHLY',
        isEssential: false,
        strictMode: false,
      },
    ],
    debts: available([]),
    constraints: { hard: { minEssentialCoverageDays: 0, maxCardUtilization: null }, soft: { avoidInterest: false, avoidNewDebt: false } },
    world: { baseInterestRate: null, inflationEstimate: null },
    cash: available({ liquidCents: null, nextPaycheckDateMs: null, nextPaycheckNetCents: null }),
    capabilities: loadedCapabilities,
    preferences: { profileId: 'BALANCED', customWeights: null },
  };

  const solverDecision = nonCardTop
    ? {
        actionId: 'reject_purchase',
        action: { type: 'REJECT_PURCHASE' },
        score: 2,
        reasons: [],
        projections: {
          buckets: [],
          debt: [],
          cash: { projectedLiquidCents: null, projectedOverdraftRisk: null },
        },
        constraintsBreached: [],
      }
    : {
        actionId: 'use_card:card-1',
        action: { type: 'USE_CARD', cardId: 'card-1' },
        score: 1,
        reasons: [],
        projections: {
          buckets: [
            {
              bucketId: 'bucket-1',
              projectedPostedSpendCents: 3000,
              projectedPendingSpendCents: 0,
              projectedCommittedCents: 3000,
              projectedRemainingCents: 7000,
              projectedOverLimit: false,
            },
          ],
          debt: [],
          cash: { projectedLiquidCents: null, projectedOverdraftRisk: null },
        },
        constraintsBreached: [],
      };

  const legacyDecision = nonCardTop
    ? {
        category: 'DINING',
        amountCents: 2000,
        budget: {
          verdict: 'UNCONFIGURED',
          coverageMode: 'UNCONFIGURED',
          hasBucket: false,
          strictMode: false,
          wouldExceed: false,
        },
        card: {
          verdict: 'NO_CARD_DATA',
          hasCardData: false,
        },
        overallVerdict: 'UNKNOWN',
        cherryIncentive: { pointsIfFollowed: 0, expiryMinutes: 0 },
      }
    : {
    category: 'DINING',
    amountCents: 2000,
    budget: {
      verdict: 'HEALTHY',
      coverageMode: 'BUDGETED',
      hasBucket: true,
      bucketId: 'bucket-1',
      name: 'Dining',
      limitCents: 10000,
      spentBeforeCents: 1000,
      spentAfterCents: 3000,
      remainingAfterCents: 7000,
      strictMode: false,
      wouldExceed: false,
    },
    card: {
      verdict: 'OPTIMAL',
      cardId: 'card-1',
      cardNickname: 'Demo Card',
      rewardUnit: 'issuer_points',
      rewardRate: 1,
      rewardPoints: 20,
      rewardValueCents: null,
      hasCardData: true,
    },
    overallVerdict: 'GREEN',
    cherryIncentive: { pointsIfFollowed: 5, expiryMinutes: 15 },
  };

  mockModule('../../lib/engine', {
    buildEngineContext: (input) => input,
    mapSolverDecisionToLegacyDecision: () => legacyDecision,
    pickTopLegacySurfaceDecision: (decisions) => decisions[0],
  });
  mockModule('../../lib/engine/run', {
    safeSolveDecisionForWorld: async () =>
      engineOk
        ? {
            ok: true,
            decisions: noDecision ? [] : [solverDecision],
            trace: {
              engineVersion: 'test',
              weights: {},
              stateSummary: { bucketCount: 1, cardCount: 1, debtCount: 0 },
              contextSummary: { surface: 'web', amountCents: 2000 },
              candidates: [],
            },
            exclusions,
            legacyDecision,
            state: engineState,
            capabilities: loadedMetadata.capabilities,
            degraded: loadedMetadata.degraded,
          }
        : {
            ok: false,
            reason: 'ENGINE_ERROR',
            message: 'fail',
            capabilities: unavailableMetadata.capabilities,
            degraded: unavailableMetadata.degraded,
          },
  });

  mockModule('../../lib/legacy-engine', {
    runEngine: async () => legacyDecision,
  });

  mockModule('../../lib/engine-state', {
    fromPrismaUserToEngineState: async () => engineState,
  });

  mockModule('../../lib/user-context', {
    resolveUserContext: async () => ({ userId: 'lab-user-1', mode: 'DEV' }),
    isPrismaP2003: () => false,
  });

  mockModule('../../lib/prisma', {
    prisma: {
      recommendationSession: {
        create: async () => ({
          id: 'session-1',
          orderToken: 'token',
          expiresAt: new Date().toISOString(),
          source: 'APP_SCAN',
        }),
      },
    },
  });
}

function resetRouteCache() {
  delete require.cache[require.resolve('../../app/api/sessions/route')];
}

async function runSessionsOk() {
  process.env.NODE_ENV = 'development';
  mockNextServer();
  setupSessionMocks({ engineOk: true });
  resetRouteCache();
  const { POST } = require('../../app/api/sessions/route');
  const payload = {
    merchantName: 'Test',
    amountCents: 2000,
    category: 'DINING',
    currency: 'USD',
  };
  const res = await POST({
    json: async () => payload,
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  const parsed = CreateSessionResponseSchema.safeParse(body);
  assert.equal(parsed.success, true);
  assert.deepEqual(body.capabilities, loadedMetadata.capabilities);
  assert.deepEqual(body.degraded, loadedMetadata.degraded);
  assert.equal(body.degradation, null);
}

async function runSessionsEngineFail() {
  process.env.NODE_ENV = 'development';
  mockNextServer();
  setupSessionMocks({ engineOk: false });
  resetRouteCache();
  const { POST } = require('../../app/api/sessions/route');
  const payload = {
    merchantName: 'Test',
    amountCents: 2000,
    category: 'DINING',
    currency: 'USD',
  };
  const res = await POST({
    json: async () => payload,
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  const parsed = CreateSessionResponseSchema.safeParse(body);
  assert.equal(parsed.success, true);
  assert.deepEqual(body.capabilities, unavailableMetadata.capabilities);
  assert.deepEqual(body.degraded, unavailableMetadata.degraded);
  assert.equal(body.degradation, null);
}

async function runSessionsNonCardNeutral() {
  process.env.NODE_ENV = 'development';
  mockNextServer();
  setupSessionMocks({ engineOk: true, nonCardTop: true });
  resetRouteCache();
  const { POST } = require('../../app/api/sessions/route');
  const res = await POST({
    json: async () => ({
      merchantName: 'Test',
      amountCents: 2000,
      category: 'DINING',
      currency: 'USD',
    }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  const parsed = CreateSessionResponseSchema.safeParse(body);
  assert.equal(parsed.success, true);
  assert.ok(body.decision);
  assert.equal(body.decision.card.cardId ?? null, null);
  assert.equal(body.decision.card.cardNickname ?? null, null);
  assert.equal(body.decision.card.rewardUnit ?? null, null);
  assert.equal(body.decision.card.verdict, 'NO_CARD_DATA');
  assert.equal(body.decision.overallVerdict, 'UNKNOWN');
  assert.equal(body.degradation, null);
}

async function runSessionsDegradedFallback() {
  process.env.NODE_ENV = 'development';
  mockNextServer();
  setupSessionMocks({
    engineOk: true,
    noDecision: true,
    exclusions: {
      creditActionsGeneratedCount: 1,
      creditUnresolvableLiabilityCount: 1,
    },
  });
  resetRouteCache();
  const { POST } = require('../../app/api/sessions/route');
  const res = await POST({
    json: async () => ({
      merchantName: 'Test',
      amountCents: 2000,
      category: 'DINING',
      currency: 'USD',
    }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  const parsed = CreateSessionResponseSchema.safeParse(body);
  assert.equal(parsed.success, true);
  assert.equal(body.sessionId, null);
  assert.equal(body.orderToken, null);
  assert.equal(body.expiresAt, null);
  assert.equal(body.error.code, CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_CODE);
  assert.equal(body.degradation?.code, CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_CODE);
}

async function run() {
  await runSessionsOk();
  await runSessionsEngineFail();
  await runSessionsNonCardNeutral();
  await runSessionsDegradedFallback();
  console.warn('api-sessions user-context: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
