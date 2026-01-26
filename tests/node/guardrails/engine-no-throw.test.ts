import * as assert from 'node:assert/strict';
import * as Module from 'node:module';
import type { Module as NodeModuleType } from 'node:module';
import { fileURLToPath } from 'node:url';
import { safeSolveDecisionForWorld } from '../../../lib/engine/run.js';
import type { EngineContext } from '../../../lib/engine/types.js';
import { makeTestWorld } from '../helpers/world.js';

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

async function runSafeSolve(): Promise<void> {
  const { world } = makeTestWorld();
  const ctx: EngineContext = {
    surface: 'web',
    nowMs: 0,
    merchantName: 'Test',
    merchantCategoryKey: 'DINING',
    amountCents: -1,
  };

  const result = await safeSolveDecisionForWorld(world, 'user-1', ctx);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'VALIDATION_ERROR');
}

async function runAuthorityFallback(): Promise<void> {
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

  mockModule(requireModule.resolve('../../../lib/prisma'), { prisma: prismaStub });

  const { simulateSpendAuthority } =
    requireModule('../../../lib/adapters/runtime/authority.prisma.js') as typeof import('../../../lib/adapters/runtime/authority.prisma.js');

  const result = await simulateSpendAuthority(
    {
      userId: 'user-1',
      amountCents: 1200,
      category: 'DINING',
      surface: 'simulate',
      counterfactuals: [],
    },
    { nowMs: 0 }
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 'fallback');
}

runSafeSolve()
  .then(runAuthorityFallback)
  .then(() => {
    process.stdout.write('engine-no-throw: ok\n');
  })
  .catch((err: unknown) => {
    const message =
      err instanceof Error ? err.stack ?? err.message : typeof err === 'string' ? err : JSON.stringify(err);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
