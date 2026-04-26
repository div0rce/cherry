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
  deriveEngineDegradation,
  deriveUnresolvableCreditLiabilityWarningText,
} = require('../../lib/engine/degradation');
const {
  AutopilotPreviewOutputSchema,
} = require('../../lib/validation/autopilot/preview');

process.env.NODE_OPTIONS = '--experimental-specifier-resolution=node';
process.env.NODE_PATH = [__dirname + '/__mocks__', process.env.NODE_PATH || ''].filter(Boolean).join(':');
require('module').Module._initPaths();
globalThis.__CHERRY_TEST_MODE__ = true;

// Canonical PR8.3 route-level runtime integration proof.
// The only allowed substitution here is fake Prisma through setPrismaClient.
// Do not mock the preview route, autopilot service, engine public path, runtime world adapter,
// or engine-state adapter in this test.

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
    '../../app/api/autopilot/preview/route',
    '../../lib/autopilot/service',
    '../../lib/engine/public',
    '../../lib/engine-state',
    '../../lib/adapters/runtime/engine-state.prisma',
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
  // Runtime-loaded cards intentionally do not carry linked debt truth through the real
  // engine-state Prisma adapter, which is the consequence this test is proving.
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
      findUnique: async () => ({
        id: 'user-1',
        engineObjectiveProfile: null,
        engineObjectiveWeights: null,
      }),
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
  await assertLiveAdapterDebtTruth('user-1');
  mockModule('../../lib/adapters/runtime/authority.prisma', {
    simulateSpendAuthority: async () => ({ ok: true, decision: makeAuthorityDecision() }),
    recordDecisionEvent: async () => {},
  });
  mockModule('../../lib/user-context', {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'DEV' }),
  });
  mockModule('../../lib/auth', {
    auth: async () => null,
  });
  mockModule('../../lib/log', {
    logGuardrailEvent: () => {},
    logInvariantViolation: () => {},
  });
  mockModule('../../lib/metrics/autopilot', {
    incrementCounter: () => {},
    observeDuration: () => {},
  });

  resetRouteCache();
  const { POST } = require('../../app/api/autopilot/preview/route');
  const response = await POST({
    json: async () => ({
      merchant: 'Cafe',
      amountCents: 1200,
      category: 'DINING',
      occurredAt: '2024-01-01T00:00:00.000Z',
    }),
  });
  const body = await response.json();
  return { response, body };
}

async function runMixedTruthfulSurvivorCase() {
  const { response, body } = await runPreview([
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

  assert.equal(response.status, 200);
  const parsed = AutopilotPreviewOutputSchema.safeParse(body);
  assert.equal(parsed.success, true);
  assert.equal(body.status, 'ok');
  assert.equal(body.recommendedCard?.id, 'card-debit');
  assert.notEqual(body.recommendedCard?.id, 'card-credit');
  const expectedWarning = deriveUnresolvableCreditLiabilityWarningText(
    deriveEngineDegradation({
      creditActionsGeneratedCount: 1,
      creditUnresolvableLiabilityCount: 1,
    })
  );
  assert.ok(expectedWarning);
  assert.ok(body.ui.explanation.warnings.includes(expectedWarning));
}

async function runCreditOnlyInvalidCase() {
  const { response, body } = await runPreview([
    makeCard({
      id: 'card-credit',
      nickname: 'Credit Card',
      isCredit: true,
      cashbackPercent: 5,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    }),
  ]);

  assert.equal(response.status, 200);
  const parsed = AutopilotPreviewOutputSchema.safeParse(body);
  assert.equal(parsed.success, true);
  assert.equal(body.status, 'fallback');
  assert.equal(body.recommendedCard, null);
  const expectedWarning = deriveUnresolvableCreditLiabilityWarningText(
    deriveEngineDegradation({
      creditActionsGeneratedCount: 1,
      creditUnresolvableLiabilityCount: 1,
    })
  );
  assert.ok(expectedWarning);
  assert.ok(body.ui.explanation.warnings.includes(expectedWarning));
  assert.equal(body.reasonCode, 'CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY');
}

async function run() {
  await runMixedTruthfulSurvivorCase();
  await runCreditOnlyInvalidCase();
  process.stdout.write('api-autopilot-preview runtime degradation: ok\n');
}

run().catch((err) => {
  const message =
    err instanceof Error ? err.stack ?? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
