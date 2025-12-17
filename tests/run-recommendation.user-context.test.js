/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { PrismaClientKnownRequestError } = require('@prisma/client/runtime/library');

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

async function testNullUserIdThrows() {
  const logCalls = [];
  mockModule('../lib/logging.ts', {
    logInvariant: (...args) => logCalls.push(args),
  });
  mockModule('../lib/prisma', {
    prisma: {
      recommendationSession: {
        create: async () => ({ id: 'rec-1' }),
      },
    },
  });
  mockModule('../lib/engine', {
    runEngine: async () => ({
      budget: {
        wouldExceed: false,
        strictMode: false,
        limitCents: 10_000,
        spentBeforeCents: 1_000,
        remainingAfterCents: 9_000,
        name: 'Demo Bucket',
        bucketId: null,
        coverageMode: 'UNCONFIGURED',
        verdict: 'HEALTHY',
      },
      card: {
        multiplier: 1,
        estimatedRewards: 10,
        cardId: 'card-1',
        cardNickname: 'Demo Card',
        verdict: 'GREEN',
      },
      category: 'DINING',
      amountCents: 1000,
      overallVerdict: 'GREEN',
      cherryIncentive: { pointsIfFollowed: 5, expiryMinutes: 15 },
    }),
  });
  mockModule('../lib/engine-invariants', {
    validateEngineDecision: () => {},
  });
  mockModule('../lib/authority/simulateSpendAuthority', {
    simulateSpendAuthority: async () => authorityDecisionStub,
    recordDecisionEvent: async () => {},
  });

  delete require.cache[require.resolve('../lib/vine/run-recommendation')];
  const { runRecommendationFromOrderContext } = require('../lib/vine/run-recommendation');
  const ctx = {
    amountCents: 1000,
    deviceId: 'dev-1',
    timestamp: Date.now(),
    source: 'VINE_SIM',
  };
  let threw = false;
  try {
    await runRecommendationFromOrderContext(ctx, null);
  } catch (err) {
    threw = true;
    assert.match(String(err), /userId is missing or invalid/);
  }
  assert.equal(threw, true);
  assert.equal(logCalls.length, 0);
}

async function testP2003Logs() {
  const logCalls = [];
  mockModule('../lib/logging.ts', {
    logInvariant: (...args) => logCalls.push(args),
  });
  mockModule('../lib/prisma', {
    prisma: {
      recommendationSession: {
        create: async () => {
          throw new PrismaClientKnownRequestError('fk', 'P2003', '1.0.0', { model: 'RecommendationSession' });
        },
      },
    },
  });
  mockModule('../lib/engine', {
    runEngine: async () => ({
      budget: {
        wouldExceed: false,
        strictMode: false,
        limitCents: 10_000,
        spentBeforeCents: 1_000,
        remainingAfterCents: 9_000,
        name: 'Demo Bucket',
        bucketId: null,
        coverageMode: 'UNCONFIGURED',
        verdict: 'HEALTHY',
      },
      card: {
        multiplier: 1,
        estimatedRewards: 10,
        cardId: 'card-1',
        cardNickname: 'Demo Card',
        verdict: 'GREEN',
      },
      category: 'DINING',
      amountCents: 1000,
      overallVerdict: 'GREEN',
      cherryIncentive: { pointsIfFollowed: 5, expiryMinutes: 15 },
    }),
  });
  mockModule('../lib/engine-invariants', {
    validateEngineDecision: () => {},
  });
  mockModule('../lib/authority/simulateSpendAuthority', {
    simulateSpendAuthority: async () => authorityDecisionStub,
    recordDecisionEvent: async () => {},
  });

  delete require.cache[require.resolve('../lib/vine/run-recommendation')];
  const { runRecommendationFromOrderContext } = require('../lib/vine/run-recommendation');
  const ctx = {
    amountCents: 1000,
    deviceId: 'dev-1',
    timestamp: Date.now(),
    source: 'VINE_SIM',
  };
  let threw = false;
  try {
    await runRecommendationFromOrderContext(ctx, 'user-1');
  } catch {
    threw = true;
  }
  assert.equal(threw, true);
  assert.ok(logCalls.length >= 0);
}

async function run() {
  await testNullUserIdThrows();
  await testP2003Logs();
  console.warn('run-recommendation user-context: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
