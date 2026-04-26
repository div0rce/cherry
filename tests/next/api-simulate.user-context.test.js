import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assert = require('node:assert/strict');

globalThis.__CHERRY_TEST_MODE__ = true;

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
const originalResolve = Module._resolveFilename;
const { getServerConfig, resetServerConfigForTests } = require('../../lib/config/store');
const { assertServerConfig } = require('../../lib/config/server');
const { AppError } = require('../../lib/errors');
const { SimulateResponseSchema } = require('../../lib/schemas/simulate');
const {
  CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_CODE,
} = require('../../lib/engine/degradation');
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const mapped = path.join(__dirname, '..', '..', request.slice(2));
    return originalResolve.call(this, mapped, parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

const authorityDecisionStub = {
  version: 'authority_v1',
  verdict: 'ALLOW_SIMULATED',
  severity: 0,
  reasons: [{ code: 'DAILY_STATE_RISKY', severity: 0, detail: 'ok' }],
  explanation: 'ok',
  inputsVersion: 'hash',
  engineVersion: 'test',
  counterfactuals: [],
};

function available(value) {
  return { kind: 'available', value };
}

const loadedCapabilities = {
  essentiality: { available: true, reason: 'loaded' },
  debt: { available: true, reason: 'loaded' },
  liquidCash: { available: true, reason: 'loaded' },
  utilization: { available: true, reason: 'loaded' },
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

function mockModule(modulePath, exports) {
  require.cache[require.resolve(modulePath)] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function mockNextAuth(sessionValue) {
  const auth = async () => auth.__nextValue ?? sessionValue;
  auth.mockResolvedValueOnce = (val) => {
    auth.__nextValue = val;
  };
  const handlers = {
    GET: async () => new Response(null, { status: 200 }),
    POST: async () => new Response(null, { status: 200 }),
  };
  mockModule('next-auth', { default: () => ({ handlers, auth }) });
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

function setupSimulationMocks({
  nonCardTop = false,
  noDecision = false,
  exclusions = {
    creditActionsGeneratedCount: 1,
    creditUnresolvableLiabilityCount: 0,
  },
} = {}) {
  const tracker = {
    bucketUpdateManyCalls: 0,
    createdTransactions: [],
  };
  const legacyDecision = nonCardTop
    ? {
        budget: {
          wouldExceed: false,
          strictMode: false,
          coverageMode: 'UNCONFIGURED',
          verdict: 'UNCONFIGURED',
          hasBucket: false,
        },
        card: {
          verdict: 'NO_CARD_DATA',
          hasCardData: false,
        },
        category: 'DINING',
        amountCents: 1000,
        overallVerdict: 'UNKNOWN',
        cherryIncentive: { pointsIfFollowed: 0, expiryMinutes: 0 },
      }
    : {
    budget: {
      wouldExceed: false,
      strictMode: false,
      limitCents: 10_000,
      spentBeforeCents: 1_000,
      spentAfterCents: 2_000,
      remainingAfterCents: 9_000,
      name: 'Demo Bucket',
      bucketId: 'bucket-1',
      coverageMode: 'BUDGETED',
      verdict: 'HEALTHY',
      hasBucket: true,
    },
    card: {
      rewardUnit: 'issuer_points',
      rewardRate: 1,
      rewardPoints: 10,
      rewardValueCents: null,
      cardId: 'card-1',
      cardNickname: 'Demo Card',
      verdict: 'OPTIMAL',
      hasCardData: true,
    },
    category: 'DINING',
    amountCents: 1000,
    overallVerdict: 'GREEN',
    cherryIncentive: { pointsIfFollowed: 5, expiryMinutes: 15 },
  };
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
    buckets: [],
    debts: available([]),
    constraints: {
      hard: { minEssentialCoverageDays: 0, maxCardUtilization: null },
      soft: { avoidInterest: false, avoidNewDebt: false },
    },
    world: { baseInterestRate: null, inflationEstimate: null },
    cash: available({ liquidCents: null, nextPaycheckDateMs: null, nextPaycheckNetCents: null }),
    capabilities: loadedCapabilities,
    preferences: { profileId: 'BALANCED', customWeights: null },
  };

  mockModule('../../lib/engine', {
    buildEngineContext: (input) => input,
    mapSolverDecisionToLegacyDecision: ({ fallback }) => fallback ?? legacyDecision,
    pickTopLegacySurfaceDecision: (decisions) => decisions[0],
    validateEngineDecision: () => {},
  });
  mockModule('../../lib/engine/run', {
    safeSolveDecisionForWorld: async () => ({
      ok: true,
      decisions: noDecision
        ? []
        : [
            nonCardTop
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
                  projections: { buckets: [], debt: [], cash: { projectedLiquidCents: null, projectedOverdraftRisk: null } },
                  constraintsBreached: [],
                },
          ],
      trace: {
        engineVersion: 'test',
        weights: {},
        stateSummary: { bucketCount: 0, cardCount: 0, debtCount: 0 },
        contextSummary: { surface: 'web', amountCents: 0 },
        candidates: [],
      },
      exclusions,
      legacyDecision,
      state: engineState,
      capabilities: loadedMetadata.capabilities,
      degraded: loadedMetadata.degraded,
    }),
  });

  mockModule('../../lib/legacy-engine', {
    runEngine: async () => legacyDecision,
  });

  mockModule('../../lib/engine-state', {
    fromPrismaUserToEngineState: async () => engineState,
  });

  mockModule('../../lib/user-context', {
    resolveUserContext: async () => ({ userId: 'lab-user-1', mode: 'DEV' }),
    assertUserId: (value) => value,
    logInvariant: () => {},
    isPrismaP2003: () => false,
  });

  mockModule('../../lib/adapters/runtime/authority.prisma', {
    simulateSpendAuthority: async () => ({ ok: true, decision: authorityDecisionStub }),
    recordDecisionEvent: async () => {},
  });

  mockModule('../../lib/prisma', {
    prisma: {
      user: {
        upsert: async ({ create, where }) => ({
          id: (create && create.id) || (where && where.id) || 'lab-user-1',
          email: (create && create.email) || 'lab@example.com',
        }),
        findUnique: async () => ({ id: 'lab-user-1', email: 'lab@example.com' }),
        create: async () => ({ id: 'lab-user-1', email: 'lab@example.com' }),
      },
      simulation: {
        create: async () => ({ id: 'sim-1' }),
      },
      bucket: {
        updateMany: async () => {
          tracker.bucketUpdateManyCalls += 1;
          return { count: 1 };
        },
      },
      simulatedTransaction: {
        create: async (args) => {
          tracker.createdTransactions.push(args.data);
          return { id: 'tx-1', ...args.data };
        },
        findFirst: async () => null,
        delete: async () => null,
        count: async () => 0,
        findMany: async () => [],
      },
      $transaction: async (arg) => {
        if (typeof arg === 'function') {
          return arg({
            simulatedTransaction: {
              create: async (args) => {
                tracker.createdTransactions.push(args.data);
                return { id: 'tx-1', ...args.data };
              },
            },
            bucket: {
              updateMany: async () => {
                tracker.bucketUpdateManyCalls += 1;
                return { count: 1 };
              },
            },
          });
        }
        return arg;
      },
    },
  });

  return tracker;
}

function resetRouteCache() {
  delete require.cache[require.resolve('../../app/api/simulate/route')];
  delete require.cache[require.resolve('../../app/api/simulations/route')];
}

async function runSimulateDev() {
  process.env.NODE_ENV = 'development';
  mockNextAuth(null);
  mockNextServer();
  mockModule('../../app/api/auth/[...nextauth]/route', { authOptions: {}, auth: async () => null });
  const tracker = setupSimulationMocks();
  resetRouteCache();
  const { POST } = require('../../app/api/simulate/route');
  const payload = {
    amountCents: 1000,
    category: 'DINING',
    merchantName: 'Test',
    mccCode: 5812,
    commit: true,
  };
  const res = await POST({
    json: async () => payload,
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  const parsed = SimulateResponseSchema.safeParse(json);
  assert.equal(parsed.success, true);
  assert.equal(json.committed, false);
  assert.equal(json.degradation, null);
  assert.equal(tracker.bucketUpdateManyCalls, 0);
  assert.equal(tracker.createdTransactions.length, 1);
}

async function runSimulateNonCardNeutral() {
  process.env.NODE_ENV = 'development';
  mockNextAuth(null);
  mockNextServer();
  mockModule('../../app/api/auth/[...nextauth]/route', { authOptions: {}, auth: async () => null });
  const tracker = setupSimulationMocks({ nonCardTop: true });
  resetRouteCache();
  const { POST } = require('../../app/api/simulate/route');
  const res = await POST({
    json: async () => ({
      amountCents: 1000,
      category: 'DINING',
      merchantName: 'Test',
      mccCode: 5812,
    }),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  const parsed = SimulateResponseSchema.safeParse(json);
  assert.equal(parsed.success, true);
  assert.equal(json.transaction, null);
  assert.equal(json.committed, false);
  assert.equal(json.decision.card.cardId ?? null, null);
  assert.equal(json.decision.card.cardNickname ?? null, null);
  assert.equal(json.decision.card.rewardUnit ?? null, null);
  assert.equal(json.decision.card.verdict, 'NO_CARD_DATA');
  assert.equal(json.decision.overallVerdict, 'UNKNOWN');
  assert.equal(tracker.createdTransactions.length, 0);
}

async function runSimulateDegradedFallback() {
  process.env.NODE_ENV = 'development';
  mockNextAuth(null);
  mockNextServer();
  mockModule('../../app/api/auth/[...nextauth]/route', { authOptions: {}, auth: async () => null });
  setupSimulationMocks({
    noDecision: true,
    exclusions: {
      creditActionsGeneratedCount: 1,
      creditUnresolvableLiabilityCount: 1,
    },
  });
  resetRouteCache();
  const { POST } = require('../../app/api/simulate/route');
  const res = await POST({
    json: async () => ({
      amountCents: 1000,
      category: 'DINING',
      merchantName: 'Test',
      mccCode: 5812,
    }),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  const parsed = SimulateResponseSchema.safeParse(json);
  assert.equal(parsed.success, true);
  assert.equal(json.transaction, null);
  assert.equal(json.decision, null);
  assert.equal(json.committed, false);
  assert.equal(json.error.code, CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_CODE);
  assert.equal(json.degradation?.code, CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_CODE);
}

async function runSimulateInvalidAmount() {
  process.env.NODE_ENV = 'development';
  mockNextAuth(null);
  mockNextServer();
  mockModule('../../app/api/auth/[...nextauth]/route', { authOptions: {}, auth: async () => null });
  setupSimulationMocks();
  resetRouteCache();
  const { POST } = require('../../app/api/simulate/route');
  const res = await POST({
    json: async () => ({
      amountCents: -100,
      category: 'DINING',
      merchantName: 'Test',
    }),
  });
  assert.equal(res.status, 400);
}

async function runSimulateMissingMerchant() {
  process.env.NODE_ENV = 'development';
  mockNextAuth(null);
  mockNextServer();
  mockModule('../../app/api/auth/[...nextauth]/route', { authOptions: {}, auth: async () => null });
  setupSimulationMocks();
  resetRouteCache();
  const { POST } = require('../../app/api/simulate/route');
  const res = await POST({
    json: async () => ({
      amountCents: 1000,
      category: 'DINING',
      merchantName: '',
    }),
  });
  assert.equal(res.status, 400);
}

function setServerEnvironment(env) {
  const priorNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  let current;
  try {
    current = getServerConfig();
  } catch {
    current = assertServerConfig({
      appBaseUrl: 'https://app.example.test',
      databaseUrl: 'file:./tmp/test.db',
      environment: 'test',
      enableDevTools: true,
      engineVersion: 'engine-test',
      wallet: { enabled: false },
      vineSignatureMode: 'warn',
      offlineEvaluatorEnabled: true,
      bankIngest: {},
    });
  }
  resetServerConfigForTests({ ...current, environment: env });
  process.env.NODE_ENV = priorNodeEnv;
}

async function runSimulateProdUnauthorized() {
  process.env.NODE_ENV = 'production';
  setServerEnvironment('production');
  mockNextAuth(null);
  mockNextServer();
  mockModule('../../app/api/auth/[...nextauth]/route', { authOptions: {}, auth: async () => null });
  setupSimulationMocks();
  mockModule('../../lib/user-context', {
    resolveUserContext: async () => {
      throw new AppError('UNAUTHORIZED', 'Unauthorized', 401);
    },
    assertUserId: (value) => value,
    logInvariant: () => {},
    isPrismaP2003: () => false,
  });
  resetRouteCache();
  const { POST } = require('../../app/api/simulate/route');
  const payload = {
    amountCents: 1000,
    category: 'DINING',
    merchantName: 'Test',
    mccCode: 5812,
  };
  const res = await POST({
    json: async () => payload,
  });
  assert.ok(res.status === 401 || res.status >= 400);
}

async function runSimulationsGetDev() {
  process.env.NODE_ENV = 'development';
  setServerEnvironment('development');
  mockNextAuth(null);
  mockNextServer();
  mockModule('../../app/api/auth/[...nextauth]/route', { authOptions: {}, auth: async () => null });
  setupSimulationMocks();
  resetRouteCache();
  const { GET } = require('../../app/api/simulations/route');
  const res = await GET({ url: 'http://localhost/api/simulations' });
  assert.equal(res.status, 200);
}

async function runSimulationsInvalidStatus() {
  process.env.NODE_ENV = 'development';
  setServerEnvironment('development');
  mockNextAuth(null);
  mockNextServer();
  mockModule('../../app/api/auth/[...nextauth]/route', { authOptions: {}, auth: async () => null });
  setupSimulationMocks();
  resetRouteCache();
  const { GET } = require('../../app/api/simulations/route');
  const res = await GET({ url: 'http://localhost/api/simulations?status=BAD' });
  assert.equal(res.status, 400);
}

async function runSimulationsGetProdUnauthorized() {
  process.env.NODE_ENV = 'production';
  setServerEnvironment('production');
  mockNextAuth(null);
  mockNextServer();
  mockModule('../../app/api/auth/[...nextauth]/route', { authOptions: {}, auth: async () => null });
  setupSimulationMocks();
  mockModule('../../lib/user-context', {
    resolveUserContext: async () => {
      throw new AppError('UNAUTHORIZED', 'Unauthorized', 401);
    },
    assertUserId: (value) => value,
    logInvariant: () => {},
    isPrismaP2003: () => false,
  });
  resetRouteCache();
  const { GET } = require('../../app/api/simulations/route');
  const res = await GET({ url: 'http://localhost/api/simulations' });
  assert.ok(res.status === 401 || res.status >= 400);
}

async function run() {
  const originalEnv = process.env.NODE_ENV;
  await runSimulateDev();
  await runSimulateNonCardNeutral();
  await runSimulateDegradedFallback();
  await runSimulateInvalidAmount();
  await runSimulateMissingMerchant();
  await runSimulateProdUnauthorized();
  await runSimulationsGetDev();
  await runSimulationsInvalidStatus();
  await runSimulationsGetProdUnauthorized();
  process.env.NODE_ENV = originalEnv;
  console.warn('api-simulate/simulations user-context: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
