import * as assert from 'node:assert/strict';
import * as Module from 'node:module';
import type { Module as NodeModuleType } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const requireModule = Module.createRequire(__filename);

function mockModule(modulePath: string, exports: unknown): void {
  const resolved = requireModule.resolve(modulePath);
  const mock = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  } as NodeModuleType;
  requireModule.cache[resolved] = mock;
}

async function run(): Promise<void> {
  const prismaStub = {
    card: {},
    rewardRule: {},
    categoryPreference: {},
    mccToRewardCategory: {},
    dailyState: {},
    recommendationSession: {},
    cherryPointLedger: {},
    decisionEvent: {},
  };

  mockModule(requireModule.resolve('../../lib/prisma'), { prisma: prismaStub });

  const { resolveCategory } =
    requireModule('../../lib/adapters/runtime/legacy-engine.prisma') as typeof import('../../lib/adapters/runtime/legacy-engine.prisma.js');

  let thrown: unknown = null;
  try {
    await resolveCategory({ mccCode: 5812, category: null, merchantName: 'Test' });
  } catch (err: unknown) {
    thrown = err;
  }

  assert.notEqual(thrown, null);
  assert.equal(typeof thrown, 'object');
  const error = thrown as { code?: string; message?: string };
  assert.equal(error.code, 'INTERNAL');
  assert.match(error.message ?? '', /Missing Prisma model: bucket/);
}

run()
  .then(() => {
    process.stdout.write('prisma-adapter-totality: ok\n');
  })
  .catch((err: unknown) => {
    const message =
      err instanceof Error ? err.stack ?? err.message : typeof err === 'string' ? err : JSON.stringify(err);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
