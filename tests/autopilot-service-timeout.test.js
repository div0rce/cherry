import assert from 'node:assert/strict';
import Module from 'node:module';

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
        findMany: async () => [{ id: 'card-1', nickname: 'Card 1', issuer: null, network: null }],
      },
      bucket: {
        findUnique: async () => null,
      },
    },
  });

  const { getAutopilotPreview } =
    requireModule('@/lib/autopilot/service');
  const { AutopilotServiceError } = requireModule('@/lib/autopilot/types');

  try {
    await getAutopilotPreview('user-timeout', {
      merchant: 'Slow Shop',
      amountCents: 1000,
      category: 'OTHER',
    });
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
