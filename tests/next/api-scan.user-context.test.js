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
const originalResolve = Module._resolveFilename;
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

function setupScanMocks({ engineOk = true } = {}) {
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
    constraints: { hard: { minEssentialCoverageDays: 0, maxCardUtilization: null }, soft: { avoidInterest: false, avoidNewDebt: false } },
    world: { baseInterestRate: null, inflationEstimate: null },
    cash: { liquidCents: null, nextPaycheckDateMs: null, nextPaycheckNetCents: null },
    preferences: { profileId: 'BALANCED', customWeights: null },
  };

  const legacyDecision = {
    category: 'DINING',
    amountCents: 1000,
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
  };

  mockModule('../../lib/engine', {
    buildEngineContext: (input) => input,
    resolveCategory: async ({ category }) => category ?? 'OTHER',
    mapSolverDecisionToLegacyDecision: () => legacyDecision,
    safeSolveDecisionForUser: async () =>
      engineOk
        ? {
            ok: true,
            decisions: [],
            trace: {
              engineVersion: 'test',
              weights: {},
              stateSummary: { bucketCount: 0, cardCount: 0, debtCount: 0 },
              contextSummary: { surface: 'web', amountCents: 0 },
              candidates: [],
            },
            legacyDecision,
            state: engineState,
          }
        : { ok: false, reason: 'ENGINE_ERROR', message: 'fail' },
  });

  mockModule('../../lib/engine-state', {
    fromPrismaUserToEngineState: async () => engineState,
  });

  mockModule('../../lib/adapters/runtime/authority.prisma', {
    simulateSpendAuthority: async () => ({ ok: true, decision: authorityDecisionStub }),
    recordDecisionEvent: async () => {},
  });

  mockModule('../../lib/user-context', {
    resolveUserContext: async () => ({ userId: 'lab-user-1', mode: 'DEV' }),
  });
}

function resetRouteCache() {
  delete require.cache[require.resolve('../../app/api/scan/route')];
}

async function runScanOk() {
  process.env.NODE_ENV = 'development';
  mockNextServer();
  setupScanMocks({ engineOk: true });
  resetRouteCache();
  const { POST } = require('../../app/api/scan/route');
  const payload = {
    merchantName: 'Test',
    expectedAmountCents: 1000,
    category: 'DINING',
    mccCode: 5812,
  };
  const res = await POST({
    json: async () => payload,
  });
  assert.equal(res.status, 200);
}

async function runScanEngineFailure() {
  process.env.NODE_ENV = 'development';
  mockNextServer();
  setupScanMocks({ engineOk: false });
  resetRouteCache();
  const { POST } = require('../../app/api/scan/route');
  const payload = {
    merchantName: 'Test',
    expectedAmountCents: 1000,
    category: 'DINING',
    mccCode: 5812,
  };
  const res = await POST({
    json: async () => payload,
  });
  assert.equal(res.status, 200);
}

async function run() {
  await runScanOk();
  await runScanEngineFailure();
  console.warn('api-scan user-context: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
