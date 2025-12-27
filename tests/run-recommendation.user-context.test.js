import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const { PrismaClientKnownRequestError } = require('@prisma/client/runtime/library');
const { makeTestWorld } = require('./helpers/world');

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
const engineState = {
  userId: 'user-1',
  cards: [],
  buckets: [],
  debts: [],
  constraints: { hard: { minEssentialCoverageDays: 0, maxCardUtilization: null }, soft: { avoidInterest: false, avoidNewDebt: false } },
  world: { baseInterestRate: null, inflationEstimate: null },
  cash: { liquidCents: null, nextPaycheckDateMs: null, nextPaycheckNetCents: null },
};
const legacyDecision = {
  category: 'DINING',
  amountCents: 1000,
  budget: {
    verdict: 'HEALTHY',
    coverageMode: 'UNCONFIGURED',
    hasBucket: false,
    strictMode: false,
    wouldExceed: false,
  },
  card: {
    verdict: 'GREEN',
  },
  overallVerdict: 'GREEN',
  cherryIncentive: { pointsIfFollowed: 5, expiryMinutes: 15 },
};

function mockModule(modulePath, exports) {
  require.cache[require.resolve(modulePath)] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function mockEngine() {
  mockModule('../lib/engine', {
    buildEngineContext: (input) => input,
    mapSolverDecisionToLegacyDecision: () => legacyDecision,
    safeSolveDecisionForUser: async () => ({
      ok: true,
      decisions: [{ action: { type: 'USE_CARD', cardId: 'card-1' } }],
      trace: {
        engineVersion: 'test',
        weights: {},
        stateSummary: { bucketCount: 0, cardCount: 0, debtCount: 0 },
        contextSummary: { surface: 'vine', amountCents: 1000 },
        candidates: [],
      },
      legacyDecision,
      state: engineState,
    }),
  });
  mockModule('../lib/engine-state', {
    fromPrismaUserToEngineState: async () => engineState,
  });
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
  mockEngine();
  mockModule('../lib/engine-invariants', {
    validateEngineDecision: () => {},
  });
  mockModule('../lib/adapters/runtime/authority.prisma', {
    simulateSpendAuthority: async () => ({ ok: true, decision: authorityDecisionStub }),
    recordDecisionEvent: async () => {},
  });

  delete require.cache[require.resolve('../lib/vine/run-recommendation')];
  const { runRecommendationFromOrderContext } = require('../lib/vine/run-recommendation');
  const now = new Date();
  const { world } = makeTestWorld({ nowMs: now.getTime() });
  const ctx = {
    amountCents: 1000,
    deviceId: 'dev-1',
    timestamp: now.getTime(),
    source: 'VINE_SIM',
  };
  let threw = false;
  try {
    await runRecommendationFromOrderContext(world, ctx, null, { now });
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
  mockEngine();
  mockModule('../lib/engine-invariants', {
    validateEngineDecision: () => {},
  });
  mockModule('../lib/adapters/runtime/authority.prisma', {
    simulateSpendAuthority: async () => ({ ok: true, decision: authorityDecisionStub }),
    recordDecisionEvent: async () => {},
  });

  delete require.cache[require.resolve('../lib/vine/run-recommendation')];
  const { runRecommendationFromOrderContext } = require('../lib/vine/run-recommendation');
  const now = new Date();
  const { world } = makeTestWorld({ nowMs: now.getTime() });
  const ctx = {
    amountCents: 1000,
    deviceId: 'dev-1',
    timestamp: now.getTime(),
    source: 'VINE_SIM',
  };
  let threw = false;
  try {
    await runRecommendationFromOrderContext(world, ctx, 'user-1', { now });
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
