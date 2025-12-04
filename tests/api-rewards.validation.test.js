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
const path = require('path');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const mapped = path.join(__dirname, '..', request.slice(2));
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
    const alt = require.resolve('next/server.js');
    mockModule(alt, exports);
  } catch {
    // ignore
  }
}

function setupRewardMocks() {
  mockNextServer();
  mockModule('../lib/prisma', {
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
  mockModule('../lib/user-context', {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'AUTHENTICATED', email: null }),
    assertUserId: () => {},
    isPrismaP2003: () => false,
    logInvariant: () => {},
  });
  mockModule('../app/api/auth/[...nextauth]/route', { authOptions: {} });
}

function resetRouteCache() {
  delete require.cache[require.resolve('../app/api/cards/[cardId]/rewards/route')];
}

async function runRewardsGetMissingCardId() {
  setupRewardMocks();
  resetRouteCache();
  const { GET } = require('../app/api/cards/[cardId]/rewards/route');
  const res = await GET(new Request('http://localhost/api/cards/card/rewards'), {
    params: Promise.resolve({ cardId: '' }),
  });
  assert.equal(res.status, 400);
}

async function runRewardsPostInvalidPayload() {
  setupRewardMocks();
  resetRouteCache();
  const { POST } = require('../app/api/cards/[cardId]/rewards/route');
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
  const { POST } = require('../app/api/cards/[cardId]/rewards/route');
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
  const { DELETE } = require('../app/api/cards/[cardId]/rewards/route');
  const res = await DELETE(
    {
      json: async () => ({}),
    },
    { params: Promise.resolve({ cardId: 'card-1' }) }
  );
  assert.equal(res.status, 400);
}

async function run() {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  await runRewardsGetMissingCardId();
  await runRewardsPostInvalidPayload();
  await runRewardsPostSuccess();
  await runRewardsDeleteMissingId();
  process.env.NODE_ENV = originalEnv;
  console.warn('api-rewards validation: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
