import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');

function mockModule(modulePath, exports) {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

function resetModules() {
  for (const modulePath of ['../../lib/prisma', '../../lib/adapters/runtime/engine-state.prisma']) {
    try {
      delete require.cache[require.resolve(modulePath)];
    } catch {
      // ignore
    }
  }
}

async function run() {
  resetModules();
  mockModule('../../lib/prisma', {
    prisma: {
      card: {
        findMany: async () => [
          {
            id: 'card-credit',
            issuer: 'Issuer',
            nickname: 'Credit Card',
            network: 'VISA',
            isCredit: true,
            rewardRules: [
              {
                id: 'rule-1',
                category: 'DINING',
                multiplier: 2,
                cashbackPercent: null,
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
    },
  });

  const {
    fromPrismaUserToEngineState,
  } = require('../../lib/adapters/runtime/engine-state.prisma');
  const state = await fromPrismaUserToEngineState(
    'user-1',
    new Date('2024-01-01T00:00:00Z').getTime()
  );

  assert.equal(state.cards.length, 1);
  assert.equal(state.cards[0].linkedDebtId, null);
  assert.equal(state.debts.kind, 'unavailable');
  assert.equal(state.scheduledPaydowns.kind, 'unavailable');
  assert.notEqual(state.capabilities.debt.available, true);

  console.warn('engine-state prisma: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
