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
const { getServerConfig, resetServerConfigForTests } = require('../lib/config/store');
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const mapped = path.join(__dirname, '..', request.slice(2));
    return originalResolve.call(this, mapped, parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

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

function mockNextAuth(sessionValue) {
  const getServerSession = async () => sessionValue;
  getServerSession.mockResolvedValueOnce = (val) => {
    getServerSession.__nextValue = val;
  };
  const wrapper = async () => {
    if (getServerSession.__nextValue !== undefined) {
      const val = getServerSession.__nextValue;
      delete getServerSession.__nextValue;
      return val;
    }
    return sessionValue;
  };
  const exports = { getServerSession: wrapper, default: () => ({}) };
  mockModule('next-auth', exports);
  return { getServerSession: wrapper };
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

const headers = new Headers();

function mockPrisma(overrides = {}) {
  // Minimal in-memory user store for lab/demo flows.
  const users = new Map();
  const client = {
    user: {
      findUnique: async ({ where }) => {
        if (where.id && users.has(where.id)) return users.get(where.id);
        if (where.email) {
          for (const value of users.values()) {
            if (value.email === where.email) return value;
          }
        }
        return null;
      },
      create: async ({ data }) => {
        const record = {
          id: data.id ?? `user-${users.size + 1}`,
          email: data.email ?? null,
          name: data.name ?? null,
        };
        users.set(record.id, record);
        return record;
      },
      upsert: async ({ where, create, update }) => {
        const existing = users.get(where.id);
        if (existing) {
          const next = { ...existing, ...update };
          users.set(where.id, next);
          return next;
        }
        const created = { id: where.id, ...(create ?? {}) };
        users.set(where.id, created);
        return created;
      },
    },
    ...overrides,
  };
  const exports = {
    prisma: client,
    getPrisma: () => client,
    initPrisma: () => client,
    setPrismaClient: () => client,
    isProduction: () => false,
  };
  const resolved = require.resolve('../lib/prisma');
  delete require.cache[resolved];
  mockModule(resolved, exports);
}

function setServerEnvironment(env) {
  const priorNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  const current = getServerConfig();
  resetServerConfigForTests({ ...current, environment: env });
  process.env.NODE_ENV = priorNodeEnv;
}

function restoreEnv(key, value) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

function stubDate(fixedMs) {
  const OriginalDate = Date;
  function PatchedDate(...args) {
    if (args.length === 0) {
      return new OriginalDate(fixedMs);
    }
    return new OriginalDate(...args);
  }
  PatchedDate.now = () => fixedMs;
  PatchedDate.parse = OriginalDate.parse;
  PatchedDate.UTC = OriginalDate.UTC;
  PatchedDate.prototype = OriginalDate.prototype;
  // @ts-expect-error - monkeypatch Date to enforce deterministic timestamps
  global.Date = PatchedDate;
  return () => {
    global.Date = OriginalDate;
  };
}

async function runDevNoAuth() {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  const restoreDate = stubDate(new Date('2024-01-01T00:00:00Z').getTime());
  setServerEnvironment('development');
  mockPrisma();
  mockNextAuth(null);
  mockNextServer();
  mockModule('../app/api/auth/[...nextauth]/route', { authOptions: {} });

  mockModule('../lib/vine/security', {
    verifyVineSignature: async () => ({ ok: true }),
  });

  mockModule('../lib/vine/run-recommendation', {
    runRecommendationFromOrderContext: async () => ({
      sessionId: 'sess-1',
      orderToken: 'token-1',
      decision: { ok: true },
      authority: authorityDecisionStub,
    }),
  });

  delete require.cache[require.resolve('../app/api/vine/order/route')];
  const { POST } = require('../app/api/vine/order/route');
  const payload = {
    deviceId: 'dev-1',
    amountCents: 1234,
    timestamp: new Date('2024-01-01T00:00:00Z').getTime(),
    merchantName: 'Test',
    mccCode: 5812,
    source: 'VINE_SIM',
  };
  const res = await POST({
    json: async () => payload,
    headers,
  });
  assert.equal(res.status, 200);
  restoreDate();
  restoreEnv('NODE_ENV', prevEnv);
}

async function runProdNoAuth() {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const restoreDate = stubDate(new Date('2024-01-01T00:00:00Z').getTime());
  setServerEnvironment('production');
  mockPrisma();
  mockNextAuth(null);
  mockNextServer();
  mockModule('../app/api/auth/[...nextauth]/route', { authOptions: {} });

  delete require.cache[require.resolve('../app/api/vine/order/route')];
  const { POST } = require('../app/api/vine/order/route');
  const payload = {
    deviceId: 'dev-1',
    amountCents: 1234,
    timestamp: new Date('2024-01-01T00:00:00Z').getTime(),
    merchantName: 'Test',
    mccCode: 5812,
    source: 'VINE_SIM',
  };
  const res = await POST({
    json: async () => payload,
    headers,
  });
  assert.ok(res.status === 401 || res.status >= 400);
  restoreDate();
  restoreEnv('NODE_ENV', prevEnv);
}

async function run() {
  await runDevNoAuth();
  await runProdNoAuth();
  console.warn('api-vine-order user-context: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
