import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
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

mockModule('next-auth', {
  default: () => ({
    handlers: {
      GET: async () => new Response(null, { status: 200 }),
      POST: async () => new Response(null, { status: 200 }),
    },
    auth: async () => null,
  }),
});
mockModule('next-auth/react', { signIn: async () => ({}) });
mockModule('../../app/api/auth/[...nextauth]/route', { authOptions: {}, auth: async () => null });
mockModule('../../lib/engine-invariants', { validateEngineDecision: () => {} });

const { prisma } = require('../../lib/prisma');
const { getServerConfig, resetServerConfigForTests } = require('../../lib/config/store');
const { POST } = require('../../app/api/vine/order/route');

const baseUrl = 'http://localhost:3000';

function setSignatureConfig(mode, environment) {
  const current = getServerConfig();
  resetServerConfigForTests({
    ...current,
    vineSignatureMode: mode,
    environment: environment ?? current.environment,
  });
}

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

async function postOrder(body, headers = {}) {
  const request = new Request(`${baseUrl}/api/vine/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const response = await POST(request);
  const json = await response.json();
  return { response, json };
}

async function run() {
  const fixedMs = new Date('2024-01-01T00:00:00Z').getTime();
  const restoreDate = stubDate(fixedMs);
  const originalMode = process.env.CHERRY_VINE_SIGNATURE_MODE;
  const originalConfig = getServerConfig();
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
  const payload = { ...ctx, source: 'VINE_SIM' };

  // Mode off: should allow missing signature
  process.env.CHERRY_VINE_SIGNATURE_MODE = 'off';
  setSignatureConfig('off', 'development');
  let result = await postOrder(payload);
  assert.equal(result.response.status, 200);

  // Enforce with good signature
  process.env.CHERRY_VINE_SIGNATURE_MODE = 'enforce';
  setSignatureConfig('enforce', 'development');
  result = await postOrder(payload, { 'X-Vine-Signature': goodSig });
  assert.equal(result.response.status, 200, JSON.stringify(result.json));

  // Warn mode should still allow invalid signatures in non-production.
  process.env.CHERRY_VINE_SIGNATURE_MODE = 'warn';
  setSignatureConfig('warn', 'development');
  result = await postOrder(payload, { 'X-Vine-Signature': 'deadbeef' });
  assert.equal(result.response.status, 200, JSON.stringify(result.json));

  // Enforce missing signature
  process.env.CHERRY_VINE_SIGNATURE_MODE = 'enforce';
  setSignatureConfig('enforce', 'development');
  result = await postOrder(payload);
  assert.equal(result.response.status, 403);
  assert.equal(result.response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(result.json, {
    error: 'Invalid signature',
    code: 'VINE_SIGNATURE_INVALID',
  });

  // Enforce wrong signature
  result = await postOrder(payload, { 'X-Vine-Signature': 'deadbeef' });
  assert.equal(result.response.status, 403);
  assert.equal(result.response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(result.json, {
    error: 'Invalid signature',
    code: 'VINE_SIGNATURE_INVALID',
  });

  // Production drift must fail even if config was overridden after startup.
  process.env.CHERRY_VINE_SIGNATURE_MODE = 'warn';
  setSignatureConfig('warn', 'production');
  result = await postOrder(payload, { 'X-Vine-Signature': goodSig });
  assert.equal(result.response.status, 500);
  assert.equal(result.response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(result.json, {
    error: 'Invalid server configuration',
    code: 'VINE_SIGNATURE_MODE_INVALID',
  });

  process.env.CHERRY_VINE_SIGNATURE_MODE = originalMode;
  setSignatureConfig(originalMode ?? originalConfig.vineSignatureMode, originalConfig.environment);
  restoreDate();
  console.warn('vine order security: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
