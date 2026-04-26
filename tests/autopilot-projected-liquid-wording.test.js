import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assert = require('node:assert/strict');
const { resetServerConfigForTests } = require('../lib/config/store');
const { assertServerConfig } = require('../lib/config/server');
const { setPrismaClient } = require('../lib/prisma');

process.env.NODE_OPTIONS = '--experimental-specifier-resolution=node';
process.env.NODE_PATH = [__dirname + '/__mocks__', process.env.NODE_PATH || ''].filter(Boolean).join(':');
require('module').Module._initPaths();
globalThis.__CHERRY_TEST_MODE__ = true;

const BANNED_PHRASES = [
  'cash left',
  'bank cash',
  'cash in your bank',
  'bank balance',
  'available cash',
  'remaining cash',
  'cash remaining',
  'liquid cash',
];

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

function resetPreviewRouteCache() {
  for (const modulePath of [
    '../app/api/autopilot/preview/route',
    '../lib/autopilot/service',
    '../lib/engine/public',
    '../lib/engine-state',
    '../lib/adapters/runtime/engine-state.prisma',
  ]) {
    try {
      delete require.cache[require.resolve(modulePath)];
    } catch {
      // ignore
    }
  }
}

function makeAuthorityDecision() {
  return {
    version: 'authority_v1',
    verdict: 'ALLOW_SIMULATED',
    severity: 0,
    reasons: [{ code: 'DAILY_STATE_RISKY', severity: 0, detail: 'ok' }],
    explanation: 'ok',
    inputsVersion: 'hash',
    engineVersion: 'test',
    counterfactuals: [],
  };
}

function makeCard({
  id,
  nickname,
  isCredit,
  cashbackPercent,
  createdAt,
}) {
  return {
    id,
    userId: 'user-1',
    issuer: 'Issuer',
    nickname,
    network: 'VISA',
    isCredit,
    createdAt,
    rewardRules: [
      {
        id: `rule-${id}`,
        cardId: id,
        category: 'DINING',
        multiplier: null,
        cashbackPercent,
        capAmount: null,
        promoStart: null,
        promoEnd: null,
      },
    ],
  };
}

function installPrismaClient(cards) {
  setPrismaClient({
    card: {
      findMany: async () => cards,
    },
    rewardRule: {
      findMany: async ({ where }) =>
        cards
          .filter((card) => where.cardId.in.includes(card.id))
          .flatMap((card) =>
            card.rewardRules.map((rule) => ({
              cardId: card.id,
              category: rule.category,
              multiplier: rule.multiplier,
              cashbackPercent: rule.cashbackPercent,
              capAmount: rule.capAmount,
            }))
          ),
    },
    bucket: {
      findMany: async () => [],
      findUnique: async () => null,
    },
    user: {
      findUnique: async ({ where }) =>
        where?.id
          ? {
              id: where.id,
              email: 'user-1@example.test',
              engineObjectiveProfile: null,
              engineObjectiveWeights: null,
            }
          : null,
    },
    simulatedTransaction: {
      findFirst: async () => null,
    },
    decisionEvent: {},
    recommendationSession: {},
    cherryPointLedger: {},
    dailyState: {},
    categoryPreference: {},
    mccToRewardCategory: {},
  });
}

async function runPreview(cards) {
  process.env.NODE_ENV = 'development';
  mockNextServer();
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

  installPrismaClient(cards);
  mockModule('../lib/adapters/runtime/authority.prisma', {
    simulateSpendAuthority: async () => ({ ok: true, decision: makeAuthorityDecision() }),
    recordDecisionEvent: async () => {},
  });
  mockModule('../lib/user-context', {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'DEV' }),
  });
  mockModule('../lib/auth', {
    auth: async () => null,
  });
  mockModule('../lib/log', {
    logGuardrailEvent: () => {},
    logInvariantViolation: () => {},
  });
  mockModule('../lib/metrics/autopilot', {
    incrementCounter: () => {},
    observeDuration: () => {},
  });

  resetPreviewRouteCache();
  const { POST } = require('../app/api/autopilot/preview/route');
  const response = await POST({
    json: async () => ({
      merchant: 'Cafe',
      amountCents: 1200,
      category: 'DINING',
      occurredAt: '2024-01-01T00:00:00.000Z',
    }),
  });

  assert.equal(response.status, 200);
  return await response.json();
}

function collectStrings(value, out = []) {
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
  return out;
}

function assertNoLiteralCashWording(label, value) {
  const strings = collectStrings(value);
  for (const text of strings) {
    const lower = text.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      assert.equal(
        lower.includes(phrase),
        false,
        `${label} contained banned literal-cash phrase ${JSON.stringify(phrase)} in ${JSON.stringify(text)}`
      );
    }
  }
}

async function runSimulationForPreview(preview) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify(preview), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  try {
    const { runSimulation } = require('../lib/autopilot/runSimulation');
    return await runSimulation(
      {
        merchant: 'Cafe',
        amount: 12,
        category: 'dining',
        timing: 'today',
      },
      { now: new Date('2024-01-01T00:00:00.000Z') }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function runMixedSurvivorCase() {
  const preview = await runPreview([
    makeCard({
      id: 'card-debit',
      nickname: 'Debit Card',
      isCredit: false,
      cashbackPercent: 1,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    }),
    makeCard({
      id: 'card-credit',
      nickname: 'Credit Card',
      isCredit: true,
      cashbackPercent: 5,
      createdAt: new Date('2024-01-02T00:00:00Z'),
    }),
  ]);
  assertNoLiteralCashWording('autopilot preview ui', preview.ui);
  const simulation = await runSimulationForPreview(preview);
  assertNoLiteralCashWording('autopilot simulation result', simulation);
}

async function runFallbackCase() {
  const preview = await runPreview([
    makeCard({
      id: 'card-credit',
      nickname: 'Credit Card',
      isCredit: true,
      cashbackPercent: 5,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    }),
  ]);
  assertNoLiteralCashWording('autopilot preview ui fallback', preview.ui);
  const simulation = await runSimulationForPreview(preview);
  assertNoLiteralCashWording('autopilot simulation result fallback', simulation);
}

async function run() {
  await runMixedSurvivorCase();
  await runFallbackCase();
  console.warn('autopilot projected-liquid wording: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
