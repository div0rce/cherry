import { createRequire } from 'node:module';
import path from 'node:path';
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
const originalResolve = Module._resolveFilename;
const { getServerConfig, resetServerConfigForTests } = require('../lib/config/store');
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const mapped = path.join(__dirname, '..', request.slice(2));
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

function mockModule(modulePath, exports) {
  require.cache[require.resolve(modulePath)] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function mockNextAuth(sessionValue) {
  const wrapper = async () => wrapper.__nextValue ?? sessionValue;
  wrapper.mockResolvedValueOnce = (val) => {
    wrapper.__nextValue = val;
  };
  mockModule('next-auth', { getServerSession: wrapper, default: () => ({}) });
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
    const alt = require.resolve('next/server.js');
    mockModule(alt, exports);
  } catch {
    // ignore
  }
}

function setupSimulationMocks() {
  const legacyDecision = {
    budget: {
      wouldExceed: false,
      strictMode: false,
      limitCents: 10_000,
      spentBeforeCents: 1_000,
      spentAfterCents: 2_000,
      remainingAfterCents: 9_000,
      name: 'Demo Bucket',
      bucketId: null,
      coverageMode: 'UNCONFIGURED',
      verdict: 'HEALTHY',
      hasBucket: false,
    },
    card: {
      multiplier: 1,
      estimatedRewards: 10,
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
    debts: [],
    constraints: {
      hard: { minEssentialCoverageDays: 0, maxCardUtilization: null },
      soft: { avoidInterest: false, avoidNewDebt: false },
    },
    world: { baseInterestRate: null, inflationEstimate: null },
    cash: { liquidCents: null, nextPaycheckDateMs: null, nextPaycheckNetCents: null },
  };

  mockModule('../lib/engine', {
    buildEngineContext: (input) => input,
    mapSolverDecisionToLegacyDecision: ({ fallback }) => fallback ?? legacyDecision,
    safeSolveDecisionForUser: async () => ({
      ok: true,
      decisions: [
        {
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
      legacyDecision,
      state: engineState,
    }),
    validateEngineDecision: () => {},
  });

  mockModule('../lib/engine-state', {
    fromPrismaUserToEngineState: async () => engineState,
  });

  mockModule('../lib/adapters/runtime/authority.prisma', {
    simulateSpendAuthority: async () => authorityDecisionStub,
    recordDecisionEvent: async () => {},
  });

  mockModule('../lib/prisma', {
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
      simulatedTransaction: {
        create: async (args) => ({ id: 'tx-1', ...args.data }),
        findFirst: async () => null,
        delete: async () => null,
        count: async () => 0,
        findMany: async () => [],
      },
      $transaction: async () => [0, []],
    },
  });
}

function resetRouteCache() {
  delete require.cache[require.resolve('../app/api/simulate/route')];
  delete require.cache[require.resolve('../app/api/simulations/route')];
}

async function runSimulateDev() {
  process.env.NODE_ENV = 'development';
  mockNextAuth(null);
  mockNextServer();
  mockModule('../app/api/auth/[...nextauth]/route', { authOptions: {} });
  setupSimulationMocks();
  resetRouteCache();
  const { POST } = require('../app/api/simulate/route');
  const payload = {
    amountCents: 1000,
    category: 'DINING',
    merchantName: 'Test',
    mccCode: 5812,
  };
  const res = await POST({
    json: async () => payload,
  });
  assert.equal(res.status, 200);
}

async function runSimulateInvalidAmount() {
  process.env.NODE_ENV = 'development';
  mockNextAuth(null);
  mockNextServer();
  mockModule('../app/api/auth/[...nextauth]/route', { authOptions: {} });
  setupSimulationMocks();
  resetRouteCache();
  const { POST } = require('../app/api/simulate/route');
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
  mockModule('../app/api/auth/[...nextauth]/route', { authOptions: {} });
  setupSimulationMocks();
  resetRouteCache();
  const { POST } = require('../app/api/simulate/route');
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
  const current = getServerConfig();
  resetServerConfigForTests({ ...current, environment: env });
  process.env.NODE_ENV = priorNodeEnv;
}

async function runSimulateProdUnauthorized() {
  process.env.NODE_ENV = 'production';
  setServerEnvironment('production');
  mockNextAuth(null);
  mockNextServer();
  mockModule('../app/api/auth/[...nextauth]/route', { authOptions: {} });
  setupSimulationMocks();
  resetRouteCache();
  const { POST } = require('../app/api/simulate/route');
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
  mockModule('../app/api/auth/[...nextauth]/route', { authOptions: {} });
  setupSimulationMocks();
  resetRouteCache();
  const { GET } = require('../app/api/simulations/route');
  const res = await GET({ url: 'http://localhost/api/simulations' });
  assert.equal(res.status, 200);
}

async function runSimulationsInvalidStatus() {
  process.env.NODE_ENV = 'development';
  setServerEnvironment('development');
  mockNextAuth(null);
  mockNextServer();
  mockModule('../app/api/auth/[...nextauth]/route', { authOptions: {} });
  setupSimulationMocks();
  resetRouteCache();
  const { GET } = require('../app/api/simulations/route');
  const res = await GET({ url: 'http://localhost/api/simulations?status=BAD' });
  assert.equal(res.status, 400);
}

async function runSimulationsGetProdUnauthorized() {
  process.env.NODE_ENV = 'production';
  setServerEnvironment('production');
  mockNextAuth(null);
  mockNextServer();
  mockModule('../app/api/auth/[...nextauth]/route', { authOptions: {} });
  setupSimulationMocks();
  resetRouteCache();
  const { GET } = require('../app/api/simulations/route');
  const res = await GET({ url: 'http://localhost/api/simulations' });
  assert.ok(res.status === 401 || res.status >= 400);
}

async function run() {
  const originalEnv = process.env.NODE_ENV;
  await runSimulateDev();
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
