import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assert = require('node:assert/strict');
const { resetServerConfigForTests } = require('../../lib/config/store');
const { assertServerConfig } = require('../../lib/config/server');
const { setPrismaClient } = require('../../lib/prisma');
const {
  CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_CODE,
} = require('../../lib/engine/degradation');
const { SimulateResponseSchema } = require('../../lib/schemas/simulate');

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
    '../../app/api/simulate/route',
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
    userId: 'lab-user-1',
    issuer: 'Issuer',
    nickname,
    network: 'VISA',
    isCredit,
    createdAt,
    rewardRules: [
      {
        id: `rule-${id}`,
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
  const tracker = {
    bucketUpdateManyCalls: 0,
    createdTransactions: [],
  };

  setPrismaClient({
    user: {
      findUnique: async ({ where }) => {
        if (where?.id) {
          return {
            id: where.id,
            email: 'lab+single-user@cherry.dev',
            name: 'Cherry Lab User',
            engineObjectiveProfile: null,
            engineObjectiveWeights: null,
          };
        }
        return null;
      },
      create: async ({ data }) => ({
        id: 'lab-user-1',
        email: data.email,
        name: data.name ?? null,
        engineObjectiveProfile: null,
        engineObjectiveWeights: null,
      }),
      upsert: async ({ where, create, update }) => ({
        id: where.id ?? create.id ?? 'lab-user-1',
        email: update.email ?? create.email,
        name: update.name ?? create.name ?? null,
        engineObjectiveProfile: null,
        engineObjectiveWeights: null,
      }),
    },
    simulation: {
      create: async () => ({ id: 'sim-1' }),
    },
    card: {
      findMany: async () => cards,
    },
    bucket: {
      findMany: async () => [],
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
    },
    rewardRule: {},
    categoryPreference: {
      findUnique: async () => null,
    },
    mccToRewardCategory: {
      findFirst: async () => null,
    },
    dailyState: {},
    recommendationSession: {},
    cherryPointLedger: {},
    decisionEvent: {},
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
  });

  return tracker;
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

async function runSimulate(cards, payload = {}) {
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

  const tracker = installPrismaClient(cards);
  await assertLiveAdapterDebtTruth('lab-user-1');
  mockModule('../../lib/auth', {
    auth: async () => null,
  });
  mockModule('../../lib/adapters/runtime/authority.prisma', {
    simulateSpendAuthority: async () => ({ ok: true, decision: makeAuthorityDecision() }),
    recordDecisionEvent: async () => {},
  });

  resetRouteCache();
  const { POST } = require('../../app/api/simulate/route');
  const response = await POST({
    json: async () => ({
      amountCents: 1200,
      category: 'DINING',
      merchantName: 'Cafe',
      mccCode: 5812,
      ...payload,
    }),
  });

  return { response, body: await response.json(), tracker };
}

async function runMixedTruthfulSurvivorCase() {
  const { response, body, tracker } = await runSimulate([
    makeCard({
      id: 'card-debit',
      nickname: 'Debit Card',
      isCredit: false,
      cashbackPercent: 1,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    }),
    makeCard({
      id: 'card-credit',
      nickname: 'Credit Winner',
      isCredit: true,
      cashbackPercent: 5,
      createdAt: new Date('2024-01-02T00:00:00Z'),
    }),
  ]);

  assert.equal(response.status, 200);
  const parsed = SimulateResponseSchema.safeParse(body);
  assert.equal(parsed.success, true);
  assert.equal(body.degradation?.code, CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_CODE);
  assert.equal(body.capabilities?.debt?.available, false);
  assert.equal(body.degraded?.debtPressure, true);
  assert.equal(body.committed, false);
  assert.ok(body.transaction);
  assert.ok(body.decision);
  assert.equal(body.decision.card.cardId, 'card-debit');
  assert.notEqual(body.decision.card.cardId, 'card-credit');
  assert.equal(body.transaction.chosenCardId, 'card-debit');
  assert.notEqual(body.transaction.chosenCardId, 'card-credit');
  assert.equal(tracker.createdTransactions.length, 1);
  assert.equal(tracker.bucketUpdateManyCalls, 0);
}

async function runCreditOnlyNoSyntheticWinnerCase() {
  const { response, body, tracker } = await runSimulate(
    [
      makeCard({
        id: 'card-credit',
        nickname: 'Credit Winner',
        isCredit: true,
        cashbackPercent: 5,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      }),
    ],
    { commit: true }
  );

  assert.equal(response.status, 200);
  const parsed = SimulateResponseSchema.safeParse(body);
  assert.equal(parsed.success, true);
  assert.equal(body.degradation?.code, CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_CODE);
  assert.equal(body.capabilities?.debt?.available, false);
  assert.equal(body.degraded?.debtPressure, true);
  assert.equal(body.committed, false);
  assert.equal(body.transaction, null);
  assert.equal(tracker.createdTransactions.length, 0);
  assert.equal(tracker.bucketUpdateManyCalls, 0);

  if (body.decision === null) {
    if (body.error && typeof body.error.code === 'string') {
      assert.equal(body.error.code, CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_CODE);
    }
    return;
  }

  assert.equal(body.decision.card.cardId ?? null, null);
  assert.equal(body.decision.card.cardNickname ?? null, null);
  assert.equal(body.decision.card.rewardUnit ?? null, null);
  assert.equal(body.decision.card.verdict, 'NO_CARD_DATA');
}

async function run() {
  await runMixedTruthfulSurvivorCase();
  await runCreditOnlyNoSyntheticWinnerCase();
  console.warn('api-simulate runtime degradation: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
