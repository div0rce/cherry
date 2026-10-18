import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assert = require('node:assert/strict');

process.env.NODE_OPTIONS = '--experimental-specifier-resolution=node';
process.env.NODE_PATH = [__dirname + '/__mocks__', process.env.NODE_PATH || ''].filter(Boolean).join(':');
require('module').Module._initPaths();
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'commonjs',
  moduleResolution: 'node',
  baseUrl: '.',
  paths: { '@/*': ['./*'] },
});
const Module = require('module');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const mapped = path.join(__dirname, '..', '..', request.slice(2));
    return originalResolve.call(this, mapped, parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

function mockModule(modulePath, exports) {
  require.cache[require.resolve(modulePath)] = {
    id: modulePath,
    filename: modulePath,
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
  try {
    const alt = require.resolve('next/server');
    mockModule(alt, exports);
  } catch {
    // ignore
  }
}

function setupRewardMocks() {
  mockNextServer();
  mockModule('../../lib/prisma', {
    prisma: {
      card: {
        findFirst: async ({ where }) =>
          where.id === 'card-1' && where.userId === 'user-1' ? { id: 'card-1', userId: 'user-1' } : null,
      },
      rewardRule: {
        findMany: async () => [],
        create: async ({ data }) => ({ id: 'rule-1', ...data }),
        findFirst: async ({ where }) => ({ id: where.id, cardId: where.cardId }),
        delete: async () => null,
      },
    },
  });
  mockModule('../../lib/user-context', {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'AUTHENTICATED', email: null }),
    assertUserId: () => {},
    isPrismaP2003: () => false,
    logInvariant: () => {},
  });
  mockModule('../../app/api/auth/[...nextauth]/route', { authOptions: {}, auth: async () => null });
}

function resetRouteCache() {
  delete require.cache[require.resolve('../../app/api/cards/[cardId]/rewards/route')];
}

async function runRewardsGetMissingCardId() {
  setupRewardMocks();
  resetRouteCache();
  const { GET } = require('../../app/api/cards/[cardId]/rewards/route');
  const res = await GET(new Request('http://localhost/api/cards/card/rewards'), {
    params: Promise.resolve({ cardId: '' }),
  });
  assert.equal(res.status, 400);
}

async function runRewardsPostInvalidPayload() {
  setupRewardMocks();
  resetRouteCache();
  const { POST } = require('../../app/api/cards/[cardId]/rewards/route');
  const res = await POST(
    {
      json: async () => ({
        category: 'DINING',
        multiplier: -1,
      }),
    },
    { params: Promise.resolve({ cardId: 'card-1' }) }
  );
  assert.equal(res.status, 400);
}

async function runRewardsPostSuccess() {
  setupRewardMocks();
  resetRouteCache();
  const { POST } = require('../../app/api/cards/[cardId]/rewards/route');
  const res = await POST(
    {
      json: async () => ({
        category: 'DINING',
        multiplier: 2,
      }),
    },
    { params: Promise.resolve({ cardId: 'card-1' }) }
  );
  assert.equal(res.status, 201);
}

async function runRewardsDeleteMissingId() {
  setupRewardMocks();
  resetRouteCache();
  const { DELETE } = require('../../app/api/cards/[cardId]/rewards/route');
  const res = await DELETE(
    {
      json: async () => ({}),
    },
    { params: Promise.resolve({ cardId: 'card-1' }) }
  );
  assert.equal(res.status, 400);
}

function setupPatchMocks(updates) {
  setupRewardMocks();
  mockModule('../../lib/prisma', {
    prisma: {
      card: {
        findFirst: async ({ where }) =>
          where.id === 'card-1' && where.userId === 'user-1' ? { id: 'card-1', userId: 'user-1' } : null,
      },
      rewardRule: {
        findFirst: async ({ where }) => (where.id === 'rule-1' ? { id: 'rule-1', cardId: where.cardId } : null),
        update: async ({ where, data }) => {
          updates.push(data);
          return { id: where.id, ...data };
        },
        delete: async () => null,
      },
    },
  });
  resetRouteCache();
  return require('../../app/api/cards/[cardId]/rewards/route');
}

function patchRequest(body) {
  return { json: async () => body };
}

async function runRewardsPatchBranches() {
  const updates = [];
  const { PATCH } = setupPatchMocks(updates);
  const params = { params: Promise.resolve({ cardId: 'card-1' }) };

  const byMultiplier = await PATCH(
    patchRequest({ rewardRuleId: 'rule-1', category: 'DINING', multiplier: 3, cashbackPercent: 5 }),
    params
  );
  assert.equal(byMultiplier.status, 200);
  assert.deepEqual(updates.at(-1), { category: 'DINING', multiplier: 3, capAmount: null });

  const byCashback = await PATCH(
    patchRequest({ rewardRuleId: 'rule-1', category: 'GROCERIES', cashbackPercent: 2, capAmountCents: 500 }),
    { params: Promise.resolve({ cardId: 'card-1' }) }
  );
  assert.equal(byCashback.status, 200);
  assert.deepEqual(updates.at(-1), { category: 'GROCERIES', multiplier: 0.02, capAmount: 500 });

  const noRate = await PATCH(patchRequest({ rewardRuleId: 'rule-1', category: 'DINING' }), {
    params: Promise.resolve({ cardId: 'card-1' }),
  });
  assert.equal(noRate.status, 400);

  const missingRule = await PATCH(patchRequest({ rewardRuleId: 'rule-x', category: 'DINING', multiplier: 2 }), {
    params: Promise.resolve({ cardId: 'card-1' }),
  });
  assert.equal(missingRule.status, 404);
  assert.equal(await missingRule.text(), 'Reward rule not found for card');

  const missingCard = await PATCH(patchRequest({ rewardRuleId: 'rule-1', category: 'DINING', multiplier: 2 }), {
    params: Promise.resolve({ cardId: 'card-x' }),
  });
  assert.equal(missingCard.status, 404);
  assert.equal(await missingCard.text(), 'Card not found for user');
  assert.equal(updates.length, 2);
}

async function runRewardsDeleteBranches() {
  const { DELETE } = setupPatchMocks([]);
  const missingRule = await DELETE(patchRequest({ rewardRuleId: 'rule-x' }), {
    params: Promise.resolve({ cardId: 'card-1' }),
  });
  assert.equal(missingRule.status, 404);
  assert.equal(await missingRule.text(), 'Reward rule not found for card');

  const deleted = await DELETE(patchRequest({ rewardRuleId: 'rule-1' }), {
    params: Promise.resolve({ cardId: 'card-1' }),
  });
  assert.equal(deleted.status, 204);
}

async function run() {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  await runRewardsGetMissingCardId();
  await runRewardsPostInvalidPayload();
  await runRewardsPostSuccess();
  await runRewardsDeleteMissingId();
  await runRewardsPatchBranches();
  await runRewardsDeleteBranches();
  process.env.NODE_ENV = originalEnv;
  console.warn('api-rewards validation: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
