/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const crypto = require('crypto');

function mockModule(modulePath, exports) {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

mockModule('next-auth', { getServerSession: async () => null, default: () => ({}) });
mockModule('next-auth/react', { signIn: async () => ({}) });
mockModule('../app/api/auth/[...nextauth]/route', { authOptions: {} });
mockModule('../lib/engine-invariants', { validateEngineDecision: () => {} });

const { prisma } = require('../lib/prisma');
const { callApi } = require('../lib/client/api');
const { getServerConfig, resetServerConfigForTests } = require('../lib/config/store');
const { POST } = require('../app/api/vine/order/route');

process.env.API_BASE_URL = 'http://localhost:3000';

function setSignatureMode(mode) {
  const current = getServerConfig();
  resetServerConfigForTests({ ...current, vineSignatureMode: mode });
}

// Use the real route handler in-process so CHERRY_VINE_SIGNATURE_MODE applies during tests.
global.fetch = async (url, init = {}) => {
  const target = typeof url === 'string' ? url : url.toString();
  const req = new Request(target, {
    method: init.method,
    headers: init.headers,
    body: init.body,
  });
  return POST(req);
};

function hmac(secret, message) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

function stubDate(fixedMs) {
  const OriginalDate = Date;
  function PatchedDate(...args) {
    if (args.length === 0) return new OriginalDate(fixedMs);
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

async function seedDevice() {
  return prisma.vineDevice.upsert({
    where: { deviceId: 'TEST-DEVICE-API' },
    update: { secret: 'api-secret-123', isActive: true, label: 'API Test Device' },
    create: {
      deviceId: 'TEST-DEVICE-API',
      secret: 'api-secret-123',
      isActive: true,
      label: 'API Test Device',
    },
  });
}

async function run() {
  const fixedMs = new Date('2024-01-01T00:00:00Z').getTime();
  const restoreDate = stubDate(fixedMs);
  const originalMode = process.env.CHERRY_VINE_SIGNATURE_MODE;
  await seedDevice();
  const ctx = {
    deviceId: 'TEST-DEVICE-API',
    amountCents: 1875,
    currency: 'USD',
    timestamp: fixedMs,
    storeId: 'STORE-API',
    terminalId: 'TERM-API',
    orderId: 'ORDER-API',
  };
  const message = [
    ctx.deviceId,
    ctx.amountCents,
    ctx.currency,
    ctx.timestamp,
    ctx.storeId,
    ctx.terminalId,
    ctx.orderId,
  ].join('|');
  const goodSig = hmac('api-secret-123', message);

  // Mode off: should allow missing signature
  process.env.CHERRY_VINE_SIGNATURE_MODE = 'off';
  setSignatureMode('off');
  let res = await callApi('/api/vine/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...ctx, source: 'VINE_SIM' }),
  });
  assert.equal(res.ok, true);

  // Enforce with good signature
  process.env.CHERRY_VINE_SIGNATURE_MODE = 'enforce';
  setSignatureMode('enforce');
  res = await callApi('/api/vine/order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Vine-Signature': goodSig,
    },
    body: JSON.stringify({ ...ctx, source: 'VINE_SIM' }),
  });
  assert.equal(res.ok, true, JSON.stringify(res.error));

  // Enforce missing signature
  res = await callApi('/api/vine/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...ctx, source: 'VINE_SIM' }),
  });
  assert.equal(res.ok, false);
  assert.equal(res.status, 401);

  // Enforce wrong signature
  res = await callApi('/api/vine/order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Vine-Signature': 'deadbeef',
    },
    body: JSON.stringify({ ...ctx, source: 'VINE_SIM' }),
  });
  assert.equal(res.ok, false);
  assert.equal(res.status, 401);

  process.env.CHERRY_VINE_SIGNATURE_MODE = originalMode;
  restoreDate();
  console.warn('vine order security: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
