import assert from 'node:assert/strict';
import Module from 'node:module';
import { makeTestWorld } from './helpers/world';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const requireModule = Module.createRequire(__filename);

function mockModule(modulePath, exports) {
  requireModule.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function resetModules() {
  const targets = ['@/lib/autopilot/service', '@/lib/engine/public', '@/lib/prisma', '@/lib/metrics/autopilot', '@/lib/log'];
  for (const target of targets) {
    try {
      const resolved = requireModule.resolve(target);
      delete requireModule.cache[resolved];
    } catch {
      // ignore
    }
  }
}

async function runTimeoutTest() {
  resetModules();
  mockModule(requireModule.resolve('@/lib/metrics/autopilot'), {
    incrementCounter: () => {},
    observeDuration: () => {},
  });
  mockModule(requireModule.resolve('@/lib/log'), {
    logInvariantViolation: () => {},
  });
  mockModule(requireModule.resolve('@/lib/engine/public'), {
    getAutopilotDecisionForUserSwipe: async () => new Promise(() => {}),
  });
  mockModule(requireModule.resolve('@/lib/prisma'), {
    prisma: {
      card: {
        findMany: async () => [
          {
            id: 'card-1',
            nickname: 'Card 1',
            issuer: null,
            network: null,
            isCredit: true,
            rewardRules: [],
          },
        ],
      },
      bucket: {
        findUnique: async () => null,
        findMany: async () => [],
      },
      dailyState: {
        findFirst: async () => null,
      },
      categoryPreference: {
        findUnique: async () => null,
      },
      recommendationSession: {
        count: async () => 0,
      },
      cherryPointLedger: {
        aggregate: async () => ({ _sum: { points: 0 } }),
      },
      rewardRule: {},
      mccToRewardCategory: {
        findMany: async () => [],
      },
      decisionEvent: {},
      user: {
        findUnique: async () => ({
          id: 'user-timeout',
          engineObjectiveProfile: null,
          engineObjectiveWeights: null,
        }),
      },
    },
  });

  const { getAutopilotPreview } =
    requireModule('@/lib/autopilot/service');
  const { AutopilotServiceError } = requireModule('@/lib/autopilot/types');
  const now = new Date('2024-01-01T00:00:00.000Z');
  const { world } = makeTestWorld({ nowMs: now.getTime() });

  try {
    await getAutopilotPreview(world, 'user-timeout', {
      merchant: 'Slow Shop',
      amountCents: 1000,
      category: 'OTHER',
    }, { now });
    assert.fail('Expected getAutopilotPreview to time out');
  } catch (err) {
    assert.ok(err instanceof AutopilotServiceError);
    assert.equal(err.status, 503);
    assert.equal(err.code, 'ENGINE_TIMEOUT');
  }
}

async function run() {
  await runTimeoutTest();
  process.stdout.write('autopilot-service-timeout: ok\n');
}

run().catch((err) => {
  const message =
    err instanceof Error ? err.stack ?? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
