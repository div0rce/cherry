import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assert = require('node:assert/strict');
const { makeTestWorld } = require('./helpers/world');
const { resetServerConfigForTests } = require('../../lib/config/store');
const { assertServerConfig } = require('../../lib/config/server');
const { setPrismaClient } = require('../../lib/prisma');
const {
  CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_CODE,
} = require('../../lib/engine/degradation');
const { ScanResponseSchema } = require('../../lib/schemas/scan');

process.env.NODE_OPTIONS = '--experimental-specifier-resolution=node';
process.env.NODE_PATH = [__dirname + '/__mocks__', process.env.NODE_PATH || ''].filter(Boolean).join(':');
require('module').Module._initPaths();
globalThis.__CHERRY_TEST_MODE__ = true;

function mockModule(modulePath, exports) {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
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
}

function resetRouteCache() {
  for (const modulePath of [
    '../../app/api/scan/route',
    '../../lib/engine-state',
    '../../lib/engine-state.js',
    '../../lib/adapters/runtime/engine-state.prisma',
    '../../lib/adapters/runtime/engine-state.prisma.js',
  ]) {
    try {
      delete require.cache[require.resolve(modulePath)];
    } catch {
      // ignore
    }
  }
}

async function assertLiveAdapterDebtTruth(userId) {
  delete require.cache[require.resolve('../../lib/engine-state')];
  delete require.cache[require.resolve('../../lib/adapters/runtime/engine-state.prisma')];
  const { fromPrismaUserToEngineState } = require('../../lib/adapters/runtime/engine-state.prisma');
  const state = await fromPrismaUserToEngineState(
    userId,
    new Date('2024-01-01T00:00:00Z').getTime()
  );
  const creditCard = state.cards.find((card) => card.isCredit === true);

  assert.ok(creditCard);
  assert.equal(creditCard.linkedDebtId, null);
  assert.equal(state.debts.kind, 'unavailable');
  assert.notEqual(state.capabilities.debt.available, true);
}

async function run() {
  process.env.NODE_ENV = 'development';
  mockNextServer();
  const { world } = makeTestWorld({ nowMs: new Date('2024-01-01T00:00:00Z').getTime() });
  resetServerConfigForTests(
    assertServerConfig({
      appBaseUrl: 'https://app.example.test',
      databaseUrl: 'file:./tmp/test.db',
      environment: 'development',
      enableDevTools: true,
      engineVersion: 'engine-test',
      wallet: { enabled: false },
      vineSignatureMode: 'off',
      offlineEvaluatorEnabled: true,
      bankIngest: {},
    })
  );
  setPrismaClient({
    card: {
      findMany: async () => [
        {
          id: 'card-credit',
          issuer: 'Issuer',
          nickname: 'Credit Winner',
          network: 'VISA',
          isCredit: true,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          rewardRules: [
            {
              id: 'rule-credit',
              category: 'DINING',
              multiplier: null,
              cashbackPercent: 5,
              capAmount: null,
              promoStart: null,
              promoEnd: null,
            },
          ],
        },
        {
          id: 'card-debit',
          issuer: 'Issuer',
          nickname: 'Debit Card',
          network: 'VISA',
          isCredit: false,
          createdAt: new Date('2024-01-02T00:00:00Z'),
          rewardRules: [
            {
              id: 'rule-debit',
              category: 'DINING',
              multiplier: null,
              cashbackPercent: 1,
              capAmount: null,
              promoStart: null,
              promoEnd: null,
            },
          ],
        },
      ],
    },
    bucket: {
      findMany: async () => [],
    },
    user: {
      findUnique: async () => null,
    },
    rewardRule: {},
    categoryPreference: {},
    mccToRewardCategory: {},
    dailyState: {},
    recommendationSession: {},
    cherryPointLedger: {},
    decisionEvent: {},
  });

  mockModule('../../lib/adapters/runtime/world.prisma', {
    buildPrismaWorld: () => world,
  });
  mockModule('../../lib/scan-helpers', {
    resolveScanCategory: async () => 'DINING',
  });
  mockModule('../../lib/adapters/runtime/authority.prisma', {
    simulateSpendAuthority: async () => ({
      ok: true,
      decision: {
        version: 'authority_v1',
        verdict: 'ALLOW_SIMULATED',
        severity: 0,
        reasons: [],
        explanation: 'ok',
        inputsVersion: 'hash',
        engineVersion: 'test',
        counterfactuals: [],
      },
    }),
    recordDecisionEvent: async () => {},
  });
  mockModule('../../lib/user-context', {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'DEV' }),
  });
  mockModule('../../lib/auth', {
    auth: async () => null,
  });
  mockModule('../../lib/legacy-engine', {
    runEngine: async () => ({
      category: 'DINING',
      amountCents: 1200,
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
    }),
  });

  await assertLiveAdapterDebtTruth('user-1');
  resetRouteCache();
  const { POST } = require('../../app/api/scan/route');
  const res = await POST({
    json: async () => ({
      merchantName: 'Cafe',
      expectedAmountCents: 1200,
      category: 'DINING',
      mccCode: 5812,
    }),
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  const parsed = ScanResponseSchema.safeParse(body);
  assert.equal(parsed.success, true);
  assert.equal(body.degradation?.code, CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_CODE);
  assert.equal(body.cardRecommendation.cardId, 'card-debit');
  assert.notEqual(body.cardRecommendation.cardId, 'card-credit');
  assert.ok('decision' in body);
  assert.ok(!('engineDecision' in body));

  console.warn('api-scan runtime degradation: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
