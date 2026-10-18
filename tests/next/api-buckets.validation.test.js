import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assert = require('node:assert/strict');

process.env.NODE_PATH = [__dirname + '/__mocks__', process.env.NODE_PATH || ''].filter(Boolean).join(':');
require('module').Module._initPaths();

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
  const exports = { NextResponse: MockResponse, NextRequest: class extends Request {} };
  const resolved = require.resolve('next/server');
  mockModule(resolved, exports);
  mockModule(resolved.replace(/\.js$/, ''), exports);
}

function loadRoute(created) {
  mockNextServer();
  mockModule('../../lib/prisma', {
    prisma: {
      bucket: {
        create: async ({ data }) => {
          created.push(data);
          return { id: 'bucket-1', createdAt: new Date(0), updatedAt: new Date(0), committedCents: 0, ...data };
        },
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
  delete require.cache[require.resolve('../../app/api/buckets/route')];
  return require('../../app/api/buckets/route');
}

function post(POST, body) {
  return POST({ json: async () => body });
}

const valid = { name: '  Food ', period: 'MONTHLY', budgetAmountCents: 10000, category: 'DINING' };

async function runCreateSuccess() {
  const created = [];
  const { POST } = loadRoute(created);
  const res = await post(POST, { ...valid, currentAmountCents: 2500 });
  assert.equal(res.status, 201);
  assert.equal(created.length, 1);
  assert.equal(created[0].name, 'Food');
  assert.equal(created[0].budgetAmount, 10000);
  assert.equal(created[0].spentCents, 7500);
  assert.equal(created[0].strictMode, true);
  assert.equal(created[0].category, 'DINING');
}

async function runCreateRejectsWhitespaceName() {
  const created = [];
  const { POST } = loadRoute(created);
  const res = await post(POST, { ...valid, name: '   ' });
  assert.equal(res.status, 400);
  assert.equal(await res.text(), 'Missing required fields: name, period, budgetAmountCents, category');
  assert.equal(created.length, 0);
}

async function runCreateRejectsSchemaViolations() {
  const created = [];
  const { POST } = loadRoute(created);
  const badCurrent = await post(POST, { ...valid, currentAmountCents: -1 });
  assert.equal(badCurrent.status, 400);
  const badPeriod = await post(POST, { ...valid, period: 'DAILY' });
  assert.equal(badPeriod.status, 400);
  assert.equal(created.length, 0);
}

async function run() {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  await runCreateSuccess();
  await runCreateRejectsWhitespaceName();
  await runCreateRejectsSchemaViolations();
  process.env.NODE_ENV = originalEnv;
  console.warn('api-buckets validation: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
