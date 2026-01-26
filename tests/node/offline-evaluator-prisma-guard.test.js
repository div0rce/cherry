import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');

function mockPrismaWithoutOfflineModels(prismaModulePath) {
  const exports = { prisma: {} };
  require.cache[prismaModulePath] = {
    id: prismaModulePath,
    filename: prismaModulePath,
    loaded: true,
    exports,
  };
  return exports.prisma;
}

async function run() {
  const prismaModulePath = require.resolve('../../lib/prisma');
  const helperPath = require.resolve('../../lib/evaluator/prisma-safe');
  const originalPrismaModule = require.cache[prismaModulePath];
  const originalHelperModule = require.cache[helperPath];

  delete require.cache[helperPath];
  mockPrismaWithoutOfflineModels(prismaModulePath);

  let threw = false;
  try {
    const { assertOfflineEvaluatorModelsReady } = require('../../lib/evaluator/prisma-safe');
    await assertOfflineEvaluatorModelsReady();
  } catch {
    threw = true;
  }
  assert.ok(threw, 'expected guard to throw when offline evaluator models are missing on the client');

  // restore original modules for other tests
  if (originalPrismaModule) {
    require.cache[prismaModulePath] = originalPrismaModule;
  } else {
    delete require.cache[prismaModulePath];
  }
  if (originalHelperModule) {
    require.cache[helperPath] = originalHelperModule;
  } else {
    delete require.cache[helperPath];
  }

  console.warn('offline-evaluator-prisma-guard: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
